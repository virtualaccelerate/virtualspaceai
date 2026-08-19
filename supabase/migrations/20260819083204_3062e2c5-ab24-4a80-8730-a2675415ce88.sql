ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE CASCADE;

UPDATE public.tasks t
SET teamspace_id = COALESCE(
  (SELECT p.current_teamspace_id FROM public.profiles p WHERE p.id = t.user_id),
  (SELECT m.teamspace_id FROM public.teamspace_members m WHERE m.user_id = t.user_id ORDER BY m.created_at LIMIT 1)
)
WHERE t.teamspace_id IS NULL;

CREATE INDEX IF NOT EXISTS tasks_teamspace_id_idx ON public.tasks (teamspace_id);

DROP POLICY IF EXISTS "Teamspace members can view tasks" ON public.tasks;
CREATE POLICY "Teamspace members can view tasks" ON public.tasks
FOR SELECT TO authenticated
USING (teamspace_id IS NOT NULL AND public.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY IF EXISTS "Teamspace members can insert tasks" ON public.tasks;
CREATE POLICY "Teamspace members can insert tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (teamspace_id IS NULL OR public.is_teamspace_member(teamspace_id, auth.uid())));

DROP POLICY IF EXISTS "Teamspace members can update tasks" ON public.tasks;
CREATE POLICY "Teamspace members can update tasks" ON public.tasks
FOR UPDATE TO authenticated
USING (teamspace_id IS NOT NULL AND public.is_teamspace_member(teamspace_id, auth.uid()))
WITH CHECK (teamspace_id IS NOT NULL AND public.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY IF EXISTS "Teamspace members can delete tasks" ON public.tasks;
CREATE POLICY "Teamspace members can delete tasks" ON public.tasks
FOR DELETE TO authenticated
USING (teamspace_id IS NOT NULL AND public.is_teamspace_member(teamspace_id, auth.uid()));