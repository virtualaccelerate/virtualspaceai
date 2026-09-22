CREATE TABLE IF NOT EXISTS public.teamspace_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_status public.task_status NOT NULL DEFAULT 'backlog',
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  source text,
  external_column_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS teamspace_statuses_unique_name
  ON public.teamspace_statuses (teamspace_id, lower(name));

GRANT SELECT ON public.teamspace_statuses TO authenticated;
GRANT ALL ON public.teamspace_statuses TO service_role;

ALTER TABLE public.teamspace_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read workspace statuses"
ON public.teamspace_statuses FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teamspace_members m
  WHERE m.teamspace_id = teamspace_statuses.teamspace_id AND m.user_id = auth.uid()
));

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_id uuid REFERENCES public.teamspace_statuses(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  source text NOT NULL DEFAULT 'virtual_space',
  kind text NOT NULL,
  field text,
  from_value text,
  to_value text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_events_task_idx ON public.task_events (task_id, created_at DESC);

GRANT SELECT ON public.task_events TO authenticated;
GRANT ALL ON public.task_events TO service_role;

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read task history"
ON public.task_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teamspace_members m
  WHERE m.teamspace_id = task_events.teamspace_id AND m.user_id = auth.uid()
));