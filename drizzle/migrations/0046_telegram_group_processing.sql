ALTER TABLE public.telegram_groups ADD COLUMN IF NOT EXISTS last_processed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_group_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_message_ids bigint[];
CREATE INDEX IF NOT EXISTS tasks_source_group_id_idx ON public.tasks (source_group_id);