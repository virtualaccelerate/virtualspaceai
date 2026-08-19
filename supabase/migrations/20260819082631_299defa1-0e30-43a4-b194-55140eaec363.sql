CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_settings (key, value)
VALUES ('cron_secret', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_daily_task_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
BEGIN
  SELECT value INTO _secret FROM public.app_settings WHERE key = 'cron_secret';
  PERFORM net.http_post(
    url := 'https://project--b3923ecf-a6ef-4e85-9da5-581fad94a65f.lovable.app/api/public/hooks/tasks-daily',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', _secret),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_daily_task_digest() FROM anon, authenticated, public;