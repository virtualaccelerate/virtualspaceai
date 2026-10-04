CREATE TABLE public.google_tasks_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  google_task_id text NOT NULL,
  tasklist_id text NOT NULL DEFAULT '@default',
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
GRANT ALL ON public.google_tasks_links TO service_role;
ALTER TABLE public.google_tasks_links ENABLE ROW LEVEL SECURITY;
-- Mirrors google_calendar_links: no client policies; only server code (service role) reads/writes.
CREATE INDEX google_tasks_links_task_idx ON public.google_tasks_links(task_id);