ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendar_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.telegram_links ADD COLUMN IF NOT EXISTS daily_digest boolean NOT NULL DEFAULT true;
ALTER TABLE public.telegram_links ADD COLUMN IF NOT EXISTS digest_hour smallint NOT NULL DEFAULT 4;
CREATE INDEX IF NOT EXISTS profiles_calendar_token_idx ON public.profiles (calendar_token);