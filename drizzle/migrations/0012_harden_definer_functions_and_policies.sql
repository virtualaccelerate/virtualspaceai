-- 1. Restrict EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_daily_task_digest() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_teamspace_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_teamspace_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_teamspace_by_code(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.documents_index_status(uuid) FROM anon;

-- 2. pending_members: only owners/admins may write
DROP POLICY IF EXISTS "Members manage pending members" ON public.pending_members;

CREATE POLICY "Managers insert pending members"
ON public.pending_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_teamspace_owner(teamspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.teamspace_members m
             WHERE m.teamspace_id = pending_members.teamspace_id
               AND m.user_id = auth.uid() AND m.role = 'admin'::member_role)
);

CREATE POLICY "Managers update pending members"
ON public.pending_members FOR UPDATE TO authenticated
USING (
  public.is_teamspace_owner(teamspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.teamspace_members m
             WHERE m.teamspace_id = pending_members.teamspace_id
               AND m.user_id = auth.uid() AND m.role = 'admin'::member_role)
)
WITH CHECK (
  public.is_teamspace_owner(teamspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.teamspace_members m
             WHERE m.teamspace_id = pending_members.teamspace_id
               AND m.user_id = auth.uid() AND m.role = 'admin'::member_role)
);

CREATE POLICY "Managers delete pending members"
ON public.pending_members FOR DELETE TO authenticated
USING (
  public.is_teamspace_owner(teamspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.teamspace_members m
             WHERE m.teamspace_id = pending_members.teamspace_id
               AND m.user_id = auth.uid() AND m.role = 'admin'::member_role)
);

-- 3. task_sync_sources: secrets readable only by owners/admins
DROP POLICY IF EXISTS "Workspace members read task sync sources" ON public.task_sync_sources;

CREATE POLICY "Workspace managers read task sync sources"
ON public.task_sync_sources FOR SELECT TO authenticated
USING (
  public.is_teamspace_owner(teamspace_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.teamspace_members m
             WHERE m.teamspace_id = task_sync_sources.teamspace_id
               AND m.user_id = auth.uid() AND m.role = 'admin'::member_role)
);