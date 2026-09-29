CREATE TABLE public.agent_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  target_user_id uuid,
  target_name text,
  kind text NOT NULL DEFAULT 'recurring',
  message text NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  schedule text NOT NULL DEFAULT 'once',
  run_time text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  runs integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_automations_due_idx ON public.agent_automations (active, next_run_at);
CREATE INDEX agent_automations_space_idx ON public.agent_automations (teamspace_id, created_at DESC);
GRANT ALL ON public.agent_automations TO service_role;
ALTER TABLE public.agent_automations ENABLE ROW LEVEL SECURITY;