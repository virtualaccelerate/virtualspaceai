CREATE TABLE IF NOT EXISTS public.ai_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  importance text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_notification_log_unique
  ON public.ai_notification_log (user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS ai_notification_log_created_idx
  ON public.ai_notification_log (created_at DESC);

GRANT SELECT ON public.ai_notification_log TO authenticated;
GRANT ALL ON public.ai_notification_log TO service_role;

ALTER TABLE public.ai_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own ai notification log" ON public.ai_notification_log;
CREATE POLICY "own ai notification log"
  ON public.ai_notification_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());