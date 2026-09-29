-- Imported tracker tasks often carry only an assignee name, not a user id.
-- Members must still see those rows, so match on the profile name/email too.
CREATE OR REPLACE FUNCTION private.task_belongs_to_user(_assignee_id uuid, _assignee_name text, _creator_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT _assignee_id = _user_id
      OR _creator_id = _user_id
      OR (
        _assignee_id IS NULL
        AND _assignee_name IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = _user_id
            AND (
              lower(btrim(p.full_name)) = lower(btrim(_assignee_name))
              OR lower(split_part(coalesce(p.email, ''), '@', 1)) = lower(btrim(_assignee_name))
            )
        )
      )
$$;

REVOKE ALL ON FUNCTION private.task_belongs_to_user(uuid, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.task_belongs_to_user(uuid, text, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Managers view all tasks, members view their own" ON public.tasks;
CREATE POLICY "Managers view all tasks, members view their own"
ON public.tasks FOR SELECT TO authenticated
USING (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR private.task_belongs_to_user(assignee_id, assignee_name, user_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers update all tasks, members update their own" ON public.tasks;
CREATE POLICY "Managers update all tasks, members update their own"
ON public.tasks FOR UPDATE TO authenticated
USING (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR private.task_belongs_to_user(assignee_id, assignee_name, user_id, auth.uid())
  )
)
WITH CHECK (
  teamspace_id IS NOT NULL
  AND private.is_teamspace_member(teamspace_id, auth.uid())
  AND (
    private.is_teamspace_manager(teamspace_id, auth.uid())
    OR private.task_belongs_to_user(assignee_id, assignee_name, user_id, auth.uid())
  )
);
