
CREATE TABLE public.financial_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sheet','file')),
  name text NOT NULL,
  source_url text,
  raw_csv text,
  analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_sources TO authenticated;
GRANT ALL ON public.financial_sources TO service_role;

ALTER TABLE public.financial_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view teamspace financial sources"
  ON public.financial_sources FOR SELECT TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "Members can insert teamspace financial sources"
  ON public.financial_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Members can update teamspace financial sources"
  ON public.financial_sources FOR UPDATE TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()))
  WITH CHECK (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "Members can delete teamspace financial sources"
  ON public.financial_sources FOR DELETE TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE TRIGGER financial_sources_set_updated_at
  BEFORE UPDATE ON public.financial_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX financial_sources_ts_idx ON public.financial_sources (teamspace_id, created_at DESC);
