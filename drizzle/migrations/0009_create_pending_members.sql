CREATE TABLE public.pending_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  source text NOT NULL DEFAULT 'import',
  created_by uuid NOT NULL,
  linked_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX pending_members_space_name_idx
  ON public.pending_members (teamspace_id, lower(name));
CREATE INDEX pending_members_space_idx ON public.pending_members (teamspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_members TO authenticated;
GRANT ALL ON public.pending_members TO service_role;

ALTER TABLE public.pending_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read pending members"
ON public.pending_members FOR SELECT TO authenticated
USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "Members manage pending members"
ON public.pending_members FOR ALL TO authenticated
USING (public.is_teamspace_member(teamspace_id, auth.uid()))
WITH CHECK (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE TRIGGER pending_members_set_updated_at
BEFORE UPDATE ON public.pending_members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();