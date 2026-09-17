-- Private schema not exposed through the Data API
CREATE SCHEMA IF NOT EXISTS private;

-- Recreate SECURITY DEFINER helpers in the private schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_teamspace_member(_ts uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teamspace_members WHERE teamspace_id = _ts AND user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION private.is_teamspace_owner(_ts uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teamspaces WHERE id = _ts AND owner_id = _uid)
$$;

-- RLS policies run as the querying role, so authenticated/service_role need EXECUTE here.
-- The private schema is not exposed via the API, so these are not publicly callable.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_teamspace_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_teamspace_owner(uuid, uuid) TO authenticated, service_role;

-- Recreate policies to reference the private helpers
DROP POLICY "members can delete teamspace documents" ON public.documents;
CREATE POLICY "members can delete teamspace documents" ON public.documents FOR DELETE TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "members can insert teamspace documents" ON public.documents;
CREATE POLICY "members can insert teamspace documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());
DROP POLICY "members can view teamspace documents" ON public.documents;
CREATE POLICY "members can view teamspace documents" ON public.documents FOR SELECT TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY "Members can delete teamspace fin chat" ON public.financial_chat_messages;
CREATE POLICY "Members can delete teamspace fin chat" ON public.financial_chat_messages FOR DELETE TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Members can insert fin chat" ON public.financial_chat_messages;
CREATE POLICY "Members can insert fin chat" ON public.financial_chat_messages FOR INSERT TO authenticated
  WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());
DROP POLICY "Members can view teamspace fin chat" ON public.financial_chat_messages;
CREATE POLICY "Members can view teamspace fin chat" ON public.financial_chat_messages FOR SELECT TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY "Members can delete teamspace financial sources" ON public.financial_sources;
CREATE POLICY "Members can delete teamspace financial sources" ON public.financial_sources FOR DELETE TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Members can insert teamspace financial sources" ON public.financial_sources;
CREATE POLICY "Members can insert teamspace financial sources" ON public.financial_sources FOR INSERT TO authenticated
  WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());
DROP POLICY "Members can update teamspace financial sources" ON public.financial_sources;
CREATE POLICY "Members can update teamspace financial sources" ON public.financial_sources FOR UPDATE TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()))
  WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Members can view teamspace financial sources" ON public.financial_sources;
CREATE POLICY "Members can view teamspace financial sources" ON public.financial_sources FOR SELECT TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY "Managers delete pending members" ON public.pending_members;
CREATE POLICY "Managers delete pending members" ON public.pending_members FOR DELETE TO authenticated
  USING (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = pending_members.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role));
DROP POLICY "Managers insert pending members" ON public.pending_members;
CREATE POLICY "Managers insert pending members" ON public.pending_members FOR INSERT TO authenticated
  WITH CHECK (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = pending_members.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role));
DROP POLICY "Managers update pending members" ON public.pending_members;
CREATE POLICY "Managers update pending members" ON public.pending_members FOR UPDATE TO authenticated
  USING (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = pending_members.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role))
  WITH CHECK (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = pending_members.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role));
DROP POLICY "Members read pending members" ON public.pending_members;
CREATE POLICY "Members read pending members" ON public.pending_members FOR SELECT TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY "Members read reminders of their workspace tasks" ON public.task_reminders;
CREATE POLICY "Members read reminders of their workspace tasks" ON public.task_reminders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_reminders.task_id AND t.teamspace_id IS NOT NULL AND private.is_teamspace_member(t.teamspace_id, auth.uid())));

DROP POLICY "Workspace managers read task sync sources" ON public.task_sync_sources;
CREATE POLICY "Workspace managers read task sync sources" ON public.task_sync_sources FOR SELECT TO authenticated
  USING (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = task_sync_sources.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role));
DROP POLICY "Workspace owners manage task sync sources" ON public.task_sync_sources;
CREATE POLICY "Workspace owners manage task sync sources" ON public.task_sync_sources FOR ALL TO authenticated
  USING (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = task_sync_sources.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role))
  WITH CHECK (private.is_teamspace_owner(teamspace_id, auth.uid()) OR EXISTS (
    SELECT 1 FROM public.teamspace_members m
    WHERE m.teamspace_id = task_sync_sources.teamspace_id AND m.user_id = auth.uid() AND m.role = 'admin'::public.member_role));

DROP POLICY "Teamspace members can delete tasks" ON public.tasks;
CREATE POLICY "Teamspace members can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (teamspace_id IS NOT NULL AND private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Teamspace members can insert tasks" ON public.tasks;
CREATE POLICY "Teamspace members can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (teamspace_id IS NULL OR private.is_teamspace_member(teamspace_id, auth.uid())));
DROP POLICY "Teamspace members can update tasks" ON public.tasks;
CREATE POLICY "Teamspace members can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (teamspace_id IS NOT NULL AND private.is_teamspace_member(teamspace_id, auth.uid()))
  WITH CHECK (teamspace_id IS NOT NULL AND private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Teamspace members can view tasks" ON public.tasks;
CREATE POLICY "Teamspace members can view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (teamspace_id IS NOT NULL AND private.is_teamspace_member(teamspace_id, auth.uid()));

DROP POLICY "Members can view co-members" ON public.teamspace_members;
CREATE POLICY "Members can view co-members" ON public.teamspace_members FOR SELECT TO authenticated
  USING (private.is_teamspace_member(teamspace_id, auth.uid()));
DROP POLICY "Owner can manage members" ON public.teamspace_members;
CREATE POLICY "Owner can manage members" ON public.teamspace_members FOR UPDATE TO authenticated
  USING (private.is_teamspace_owner(teamspace_id, auth.uid()))
  WITH CHECK (private.is_teamspace_owner(teamspace_id, auth.uid()));
DROP POLICY "User or owner can remove membership" ON public.teamspace_members;
CREATE POLICY "User or owner can remove membership" ON public.teamspace_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.is_teamspace_owner(teamspace_id, auth.uid()));

DROP POLICY "Members can view teamspace" ON public.teamspaces;
CREATE POLICY "Members can view teamspace" ON public.teamspaces FOR SELECT TO authenticated
  USING (private.is_teamspace_member(id, auth.uid()));

-- Repoint storage bucket policies to the private helper
DROP POLICY "members can view teamspace files" ON storage.objects;
CREATE POLICY "members can view teamspace files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents'::text AND private.is_teamspace_member(((storage.foldername(name))[1])::uuid, auth.uid()));
DROP POLICY "members can upload teamspace files" ON storage.objects;
CREATE POLICY "members can upload teamspace files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents'::text AND private.is_teamspace_member(((storage.foldername(name))[1])::uuid, auth.uid()) AND owner = auth.uid());
DROP POLICY "members can delete teamspace files" ON storage.objects;
CREATE POLICY "members can delete teamspace files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents'::text AND private.is_teamspace_member(((storage.foldername(name))[1])::uuid, auth.uid()));
DROP POLICY "Workspace members can read workspace logos" ON storage.objects;
CREATE POLICY "Workspace members can read workspace logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'workspace-logos'::text AND private.is_teamspace_member(((storage.foldername(name))[1])::uuid, auth.uid()));

-- Drop the public-schema helpers now that no policy references them.
DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.is_teamspace_member(uuid, uuid);
DROP FUNCTION public.is_teamspace_owner(uuid, uuid);

-- The invite-code RPC is replaced by a server-side function; lock it down.
REVOKE EXECUTE ON FUNCTION public.join_teamspace_by_code(text) FROM PUBLIC, anon, authenticated;

-- Trigger/cron-only definer functions: not callable from the API.
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_daily_task_digest() FROM PUBLIC, anon, authenticated;