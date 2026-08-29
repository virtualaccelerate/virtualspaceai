ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignee_id uuid;

CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx
ON public.tasks (assignee_id);

CREATE INDEX IF NOT EXISTS tasks_teamspace_assignee_idx
ON public.tasks (teamspace_id, assignee_id);