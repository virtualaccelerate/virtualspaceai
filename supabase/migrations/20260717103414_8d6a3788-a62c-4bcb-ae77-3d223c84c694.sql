
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint DEFAULT 0,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view teamspace documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "members can insert teamspace documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "uploaders can update their documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members can delete teamspace documents"
  ON public.documents FOR DELETE TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX documents_teamspace_idx ON public.documents(teamspace_id, created_at DESC);

-- Storage RLS: users can access files under documents/<teamspace_id>/... if they're members
CREATE POLICY "members can view teamspace files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_teamspace_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "members can upload teamspace files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.is_teamspace_member((storage.foldername(name))[1]::uuid, auth.uid())
    AND owner = auth.uid()
  );

CREATE POLICY "members can delete teamspace files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_teamspace_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
