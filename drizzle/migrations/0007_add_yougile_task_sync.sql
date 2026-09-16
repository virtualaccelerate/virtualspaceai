CREATE TABLE public.task_sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'yougile'),
  api_key_ciphertext text NOT NULL,
  project_id text,
  project_name text,
  webhook_secret text NOT NULL,
  webhook_id text,
  column_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teamspace_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_sync_sources TO authenticated;
GRANT ALL ON public.task_sync_sources TO service_role;
ALTER TABLE public.task_sync_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members read task sync sources" ON public.task_sync_sources FOR SELECT TO authenticated USING (public.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "Workspace owners manage task sync sources" ON public.task_sync_sources FOR ALL TO authenticated USING (public.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.teamspace_members m WHERE m.teamspace_id = task_sync_sources.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin')) WITH CHECK (public.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (SELECT 1 FROM public.teamspace_members m WHERE m.teamspace_id = task_sync_sources.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'));
CREATE TRIGGER task_sync_sources_set_updated_at BEFORE UPDATE ON public.task_sync_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ADD COLUMN external_source text;
ALTER TABLE public.tasks ADD COLUMN external_id text;
ALTER TABLE public.tasks ADD COLUMN external_url text;
ALTER TABLE public.tasks ADD COLUMN external_project text;
ALTER TABLE public.tasks ADD COLUMN external_board text;
ALTER TABLE public.tasks ADD COLUMN external_column_id text;
ALTER TABLE public.tasks ADD COLUMN external_updated_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN external_archived boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX tasks_external_source_id_unique ON public.tasks (teamspace_id, external_source, external_id) WHERE external_source IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX task_sync_sources_enabled_idx ON public.task_sync_sources (enabled, last_sync_at);
CREATE INDEX tasks_external_active_idx ON public.tasks (teamspace_id, external_source, external_archived) WHERE external_source IS NOT NULL;