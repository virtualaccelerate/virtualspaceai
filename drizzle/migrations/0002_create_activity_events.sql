CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE SET NULL,
  kind text NOT NULL,
  feature text NOT NULL,
  path text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own activity"
ON public.activity_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own activity"
ON public.activity_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX activity_events_created_at_idx ON public.activity_events (created_at DESC);
CREATE INDEX activity_events_teamspace_idx ON public.activity_events (teamspace_id, created_at DESC);
CREATE INDEX activity_events_feature_idx ON public.activity_events (feature, created_at DESC);