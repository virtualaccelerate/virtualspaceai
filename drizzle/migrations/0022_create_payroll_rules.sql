CREATE TABLE public.payroll_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('fixed','project','task')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KGS',
  project text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payroll_rules_ts_idx ON public.payroll_rules(teamspace_id, user_id);
GRANT ALL ON public.payroll_rules TO service_role;
ALTER TABLE public.payroll_rules ENABLE ROW LEVEL SECURITY;