ALTER TABLE public.task_sync_sources ADD COLUMN IF NOT EXISTS project_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS external_project_id text;

ALTER TABLE public.task_events ADD COLUMN IF NOT EXISTS external_event_id text;

UPDATE public.task_sync_sources
SET project_ids = jsonb_build_array(jsonb_build_object('id', project_id, 'name', coalesce(project_name, project_id)))
WHERE project_id IS NOT NULL AND project_ids = '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS task_events_external_unique
  ON public.task_events (task_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_external_project_id_idx
  ON public.tasks (teamspace_id, external_project_id);