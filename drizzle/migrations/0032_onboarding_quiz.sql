CREATE TABLE public.onboarding_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.onboarding_programs(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  explanation text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_quiz_questions_program_idx ON public.onboarding_quiz_questions(program_id, position);
GRANT ALL ON public.onboarding_quiz_questions TO service_role;
ALTER TABLE public.onboarding_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.onboarding_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.onboarding_assignments(id) ON DELETE CASCADE,
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_quiz_attempts_assignment_idx ON public.onboarding_quiz_attempts(assignment_id, created_at DESC);
GRANT ALL ON public.onboarding_quiz_attempts TO service_role;
ALTER TABLE public.onboarding_quiz_attempts ENABLE ROW LEVEL SECURITY;