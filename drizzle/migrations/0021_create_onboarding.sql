CREATE TABLE public.onboarding_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  audience text,
  created_by uuid NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_programs TO authenticated;
GRANT ALL ON public.onboarding_programs TO service_role;
ALTER TABLE public.onboarding_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view programs" ON public.onboarding_programs FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert programs" ON public.onboarding_programs FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update programs" ON public.onboarding_programs FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete programs" ON public.onboarding_programs FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE TRIGGER onboarding_programs_set_updated_at BEFORE UPDATE ON public.onboarding_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.onboarding_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.onboarding_programs(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'link',
  title text NOT NULL,
  url text,
  content text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_materials TO authenticated;
GRANT ALL ON public.onboarding_materials TO service_role;
ALTER TABLE public.onboarding_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view materials" ON public.onboarding_materials FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert materials" ON public.onboarding_materials FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update materials" ON public.onboarding_materials FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete materials" ON public.onboarding_materials FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX onboarding_materials_program_idx ON public.onboarding_materials (program_id, position);

CREATE TABLE public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.onboarding_programs(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.onboarding_steps TO service_role;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view steps" ON public.onboarding_steps FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert steps" ON public.onboarding_steps FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update steps" ON public.onboarding_steps FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete steps" ON public.onboarding_steps FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX onboarding_steps_program_idx ON public.onboarding_steps (program_id, position);

CREATE TABLE public.onboarding_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.onboarding_steps(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.onboarding_programs(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'task',
  material_id uuid REFERENCES public.onboarding_materials(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_items TO authenticated;
GRANT ALL ON public.onboarding_items TO service_role;
ALTER TABLE public.onboarding_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view items" ON public.onboarding_items FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert items" ON public.onboarding_items FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update items" ON public.onboarding_items FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete items" ON public.onboarding_items FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX onboarding_items_step_idx ON public.onboarding_items (step_id, position);

CREATE TABLE public.onboarding_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.onboarding_programs(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  status text NOT NULL DEFAULT 'in_progress',
  score integer,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_assignments TO authenticated;
GRANT ALL ON public.onboarding_assignments TO service_role;
ALTER TABLE public.onboarding_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view assignments" ON public.onboarding_assignments FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert assignments" ON public.onboarding_assignments FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update assignments" ON public.onboarding_assignments FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete assignments" ON public.onboarding_assignments FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX onboarding_assignments_user_idx ON public.onboarding_assignments (teamspace_id, user_id);

CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.onboarding_assignments(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  ref_kind text NOT NULL,
  ref_id uuid NOT NULL,
  done boolean NOT NULL DEFAULT true,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, ref_kind, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view progress" ON public.onboarding_progress FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members insert progress" ON public.onboarding_progress FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members update progress" ON public.onboarding_progress FOR UPDATE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY "members delete progress" ON public.onboarding_progress FOR DELETE TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX onboarding_progress_assignment_idx ON public.onboarding_progress (assignment_id);