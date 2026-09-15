ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS proof_note text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

ALTER TABLE public.telegram_links
  ADD COLUMN IF NOT EXISTS pending_proof_task_id uuid;

CREATE TABLE IF NOT EXISTS public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, kind)
);

GRANT SELECT ON public.task_reminders TO authenticated;
GRANT ALL ON public.task_reminders TO service_role;

ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read reminders of their workspace tasks"
ON public.task_reminders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_reminders.task_id
      AND t.teamspace_id IS NOT NULL
      AND public.is_teamspace_member(t.teamspace_id, auth.uid())
  )
);