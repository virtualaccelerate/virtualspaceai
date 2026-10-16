-- Workspace creation already adds the owner through a SECURITY DEFINER trigger.
-- Invite joins already use the authenticated, service-role-only server function.
DROP POLICY "User can add self as member" ON public.teamspace_members;
REVOKE INSERT ON public.teamspace_members FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.guard_teamspace_member_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Trusted server operations retain their existing role-management behavior.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.role IN ('owner'::public.member_role, 'admin'::public.member_role) AND NOT (
    auth.uid() IS NOT NULL
    AND NEW.user_id = auth.uid()
    AND NEW.role = 'owner'::public.member_role
    AND EXISTS (
      SELECT 1 FROM public.teamspaces ts
      WHERE ts.id = NEW.teamspace_id AND ts.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Client inserts cannot grant elevated workspace roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.guard_teamspace_member_insert() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_teamspace_member_insert
BEFORE INSERT ON public.teamspace_members
FOR EACH ROW EXECUTE FUNCTION private.guard_teamspace_member_insert();

DROP POLICY "Users can insert own tasks" ON public.tasks;

ALTER POLICY "members insert programs" ON public.onboarding_programs
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members update programs" ON public.onboarding_programs
USING (private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members delete programs" ON public.onboarding_programs
USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

ALTER POLICY "members insert steps" ON public.onboarding_steps
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members update steps" ON public.onboarding_steps
USING (private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members delete steps" ON public.onboarding_steps
USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

ALTER POLICY "members insert items" ON public.onboarding_items
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members update items" ON public.onboarding_items
USING (private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members delete items" ON public.onboarding_items
USING (private.is_teamspace_manager(teamspace_id, auth.uid()));

ALTER POLICY "members insert materials" ON public.onboarding_materials
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members update materials" ON public.onboarding_materials
USING (private.is_teamspace_manager(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_manager(teamspace_id, auth.uid()));
ALTER POLICY "members delete materials" ON public.onboarding_materials
USING (private.is_teamspace_manager(teamspace_id, auth.uid()));