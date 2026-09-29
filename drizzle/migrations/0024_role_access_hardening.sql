-- Manager (owner/admin) helper, mirrors private.is_teamspace_member
CREATE OR REPLACE FUNCTION private.is_teamspace_manager(_teamspace_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = _teamspace_id
      AND m.user_id = _user_id
      AND m.role IN ('owner', 'admin')
  )
$$;

REVOKE ALL ON FUNCTION private.is_teamspace_manager(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_teamspace_manager(uuid, uuid) TO authenticated, service_role;

-- ---------------- tasks: members only see/change their own work ----------------
DROP POLICY IF EXISTS "Teamspace members can view tasks" ON public.tasks;
CREATE POLICY "Managers view all tasks, members view their own"
ON public.tasks FOR SELECT TO authenticated
USING (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR assignee_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teamspace members can update tasks" ON public.tasks;
CREATE POLICY "Managers update all tasks, members update their own"
ON public.tasks FOR UPDATE TO authenticated
USING (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR assignee_id = auth.uid()
    OR user_id = auth.uid()
  )
)
WITH CHECK (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR assignee_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teamspace members can delete tasks" ON public.tasks;
CREATE POLICY "Managers delete all tasks, members delete their own"
ON public.tasks FOR DELETE TO authenticated
USING (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR user_id = auth.uid()
  )
);

-- ---------------- financials: managers only ----------------
DROP POLICY IF EXISTS "Members can view teamspace financial sources" ON public.financial_sources;
DROP POLICY IF EXISTS "Members can insert teamspace financial sources" ON public.financial_sources;
DROP POLICY IF EXISTS "Members can update teamspace financial sources" ON public.financial_sources;
DROP POLICY IF EXISTS "Members can delete teamspace financial sources" ON public.financial_sources;

CREATE POLICY "Managers view financial sources" ON public.financial_sources
FOR SELECT TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "Managers insert financial sources" ON public.financial_sources
FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Managers update financial sources" ON public.financial_sources
FOR UPDATE TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "Managers delete financial sources" ON public.financial_sources
FOR DELETE TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view teamspace fin chat" ON public.financial_chat_messages;
DROP POLICY IF EXISTS "Members can insert fin chat" ON public.financial_chat_messages;
DROP POLICY IF EXISTS "Members can delete teamspace fin chat" ON public.financial_chat_messages;

CREATE POLICY "Managers view fin chat" ON public.financial_chat_messages
FOR SELECT TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "Managers insert fin chat" ON public.financial_chat_messages
FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Managers delete fin chat" ON public.financial_chat_messages
FOR DELETE TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

-- ---------------- onboarding: own assignment/progress or manager ----------------
DROP POLICY IF EXISTS "members view assignments" ON public.onboarding_assignments;
DROP POLICY IF EXISTS "members insert assignments" ON public.onboarding_assignments;
DROP POLICY IF EXISTS "members update assignments" ON public.onboarding_assignments;
DROP POLICY IF EXISTS "members delete assignments" ON public.onboarding_assignments;

CREATE POLICY "own or manager view assignments" ON public.onboarding_assignments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "managers insert assignments" ON public.onboarding_assignments
FOR INSERT TO authenticated WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "own or manager update assignments" ON public.onboarding_assignments
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (user_id = auth.uid() OR private.is_teamspace_manager(teamspace_id, auth.uid()));
CREATE POLICY "managers delete assignments" ON public.onboarding_assignments
FOR DELETE TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

DROP POLICY IF EXISTS "members view progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "members insert progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "members update progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "members delete progress" ON public.onboarding_progress;

CREATE POLICY "own or manager view progress" ON public.onboarding_progress
FOR SELECT TO authenticated
USING (
  private.is_teamspace_manager(teamspace_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.onboarding_assignments a
    WHERE a.id = assignment_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "own or manager insert progress" ON public.onboarding_progress
FOR INSERT TO authenticated
WITH CHECK (
  private.is_teamspace_manager(teamspace_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.onboarding_assignments a
    WHERE a.id = assignment_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "own or manager update progress" ON public.onboarding_progress
FOR UPDATE TO authenticated
USING (
  private.is_teamspace_manager(teamspace_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.onboarding_assignments a
    WHERE a.id = assignment_id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  private.is_teamspace_manager(teamspace_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.onboarding_assignments a
    WHERE a.id = assignment_id AND a.user_id = auth.uid()
  )
);
CREATE POLICY "managers delete progress" ON public.onboarding_progress
FOR DELETE TO authenticated USING (private.is_teamspace_manager(teamspace_id, auth.uid()));
