ALTER TABLE public.teamspaces ADD COLUMN IF NOT EXISTS logo_path text;

CREATE POLICY "Workspace members can read workspace logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND public.is_teamspace_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "Workspace owners and admins can insert workspace logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Workspace owners and admins can update workspace logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'workspace-logos'
  AND EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Workspace owners and admins can delete workspace logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workspace-logos'
  AND EXISTS (
    SELECT 1 FROM public.teamspace_members tm
    WHERE tm.teamspace_id = (storage.foldername(name))[1]::uuid
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  )
);