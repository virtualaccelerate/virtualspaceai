CREATE POLICY "Workspace admins can update workspace logo"
ON public.teamspaces FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = teamspaces.id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = teamspaces.id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  )
);