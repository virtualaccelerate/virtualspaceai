CREATE TABLE public.telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL UNIQUE,
  title text,
  teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE SET NULL,
  project text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','linked','left')),
  bot_added_at timestamptz NOT NULL DEFAULT now(),
  bot_is_admin boolean NOT NULL DEFAULT false,
  linked_by uuid,
  link_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.telegram_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.telegram_groups(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  message_id bigint NOT NULL,
  from_id bigint,
  from_username text,
  author_name text,
  text text,
  sent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, message_id)
);
CREATE INDEX telegram_group_messages_group_sent_idx ON public.telegram_group_messages (group_id, sent_at DESC);
GRANT SELECT, UPDATE ON public.telegram_groups TO authenticated;
GRANT ALL ON public.telegram_groups TO service_role;
GRANT SELECT ON public.telegram_group_messages TO authenticated;
GRANT ALL ON public.telegram_group_messages TO service_role;
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read linked groups" ON public.telegram_groups FOR SELECT TO authenticated
  USING (teamspace_id IS NOT NULL AND COALESCE(private.is_teamspace_manager(teamspace_id, auth.uid()), false));
CREATE POLICY "Managers update linked groups" ON public.telegram_groups FOR UPDATE TO authenticated
  USING (teamspace_id IS NOT NULL AND COALESCE(private.is_teamspace_manager(teamspace_id, auth.uid()), false))
  WITH CHECK (teamspace_id IS NOT NULL AND COALESCE(private.is_teamspace_manager(teamspace_id, auth.uid()), false));
CREATE POLICY "Managers read group messages" ON public.telegram_group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.telegram_groups g WHERE g.id = group_id AND g.teamspace_id IS NOT NULL
    AND COALESCE(private.is_teamspace_manager(g.teamspace_id, auth.uid()), false)));