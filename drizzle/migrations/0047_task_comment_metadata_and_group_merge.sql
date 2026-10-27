ALTER TABLE public.task_events ADD COLUMN IF NOT EXISTS mentions uuid[] NOT NULL DEFAULT '{}', ADD COLUMN IF NOT EXISTS edited_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS task_events_comments_idx ON public.task_events(task_id) WHERE kind = 'comment' AND deleted_at IS NULL;
ALTER TABLE public.telegram_groups ADD COLUMN IF NOT EXISTS merged_into uuid REFERENCES public.telegram_groups(id), ADD COLUMN IF NOT EXISTS previous_chat_ids bigint[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.merge_telegram_group(old_chat bigint, new_chat bigint) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.telegram_groups; new_row public.telegram_groups; survivor uuid; loser uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(735814);
  SELECT * INTO old_row FROM public.telegram_groups WHERE chat_id = old_chat;
  SELECT * INTO new_row FROM public.telegram_groups WHERE chat_id = new_chat;
  IF old_row.id IS NULL THEN RETURN new_row.id; END IF;
  IF old_row.merged_into IS NOT NULL THEN RETURN old_row.merged_into; END IF;
  IF old_chat = new_chat THEN RETURN old_row.id; END IF;
  IF new_row.id IS NOT NULL AND old_row.teamspace_id IS NOT NULL AND new_row.teamspace_id IS NOT NULL AND old_row.teamspace_id <> new_row.teamspace_id THEN RAISE EXCEPTION 'Group workspace conflict'; END IF;
  survivor := old_row.id;
  IF new_row.id IS NOT NULL THEN
    loser := new_row.id;
    UPDATE public.telegram_group_messages SET group_id = survivor WHERE group_id = loser;
    UPDATE public.tasks SET source_group_id = survivor WHERE source_group_id = loser;
    UPDATE public.telegram_groups SET merged_into = survivor, status = 'left', link_code = NULL WHERE id = loser;
    UPDATE public.telegram_groups SET chat_id = old_chat WHERE id = loser;
    -- Avoid the unique chat-id conflict while retaining the inactive alias row.
    UPDATE public.telegram_groups SET chat_id = new_chat WHERE id = survivor;
  ELSE
    UPDATE public.telegram_groups SET chat_id = new_chat WHERE id = survivor;
  END IF;
  UPDATE public.telegram_groups SET
    previous_chat_ids = ARRAY(SELECT DISTINCT x FROM unnest(old_row.previous_chat_ids || ARRAY[old_chat] || COALESCE(new_row.previous_chat_ids, '{}'::bigint[])) x),
    teamspace_id = COALESCE(old_row.teamspace_id, new_row.teamspace_id),
    project = COALESCE(old_row.project, new_row.project),
    linked_by = COALESCE(old_row.linked_by, new_row.linked_by),
    status = CASE WHEN old_row.status = 'linked' OR new_row.status = 'linked' THEN 'linked' ELSE old_row.status END,
    bot_added_at = LEAST(old_row.bot_added_at, COALESCE(new_row.bot_added_at, old_row.bot_added_at)),
    last_processed_at = CASE WHEN old_row.last_processed_at IS NULL OR new_row.last_processed_at IS NULL THEN NULL ELSE LEAST(old_row.last_processed_at, new_row.last_processed_at) END,
    title = COALESCE(new_row.title, old_row.title),
    bot_is_admin = COALESCE(new_row.bot_is_admin, old_row.bot_is_admin),
    link_code = CASE WHEN old_row.status = 'linked' OR new_row.status = 'linked' THEN NULL ELSE old_row.link_code END
  WHERE id = survivor;
  RETURN survivor;
END $$;
REVOKE ALL ON FUNCTION public.merge_telegram_group(bigint,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_telegram_group(bigint,bigint) TO service_role;