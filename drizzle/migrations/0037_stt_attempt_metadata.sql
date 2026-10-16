CREATE TABLE public.stt_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, teamspace_id uuid, source text NOT NULL CHECK (source IN ('web','telegram','whatsapp')), mime_type text NOT NULL, bytes integer NOT NULL, duration_ms integer, model_used text NOT NULL, status text NOT NULL CHECK (status IN ('ok','empty','error')), error text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.stt_log TO service_role;
ALTER TABLE public.stt_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX stt_log_created_at_idx ON public.stt_log(created_at DESC);
CREATE TABLE public.stt_service_state (model text PRIMARY KEY, reason text NOT NULL, status integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.stt_service_state TO service_role;
ALTER TABLE public.stt_service_state ENABLE ROW LEVEL SECURITY;