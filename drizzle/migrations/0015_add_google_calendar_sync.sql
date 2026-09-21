CREATE TABLE public.google_calendar_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id text NOT NULL DEFAULT 'primary',
  calendar_name text,
  sync_token text,
  last_sync_at timestamptz,
  last_error text,
  reconnect_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_calendar_settings TO service_role;
ALTER TABLE public.google_calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.google_calendar_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  calendar_id text NOT NULL DEFAULT 'primary',
  etag text,
  event_updated_at timestamptz,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_links_task_unique UNIQUE (user_id, task_id),
  CONSTRAINT google_calendar_links_event_unique UNIQUE (user_id, calendar_id, event_id)
);
GRANT ALL ON public.google_calendar_links TO service_role;
ALTER TABLE public.google_calendar_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX google_calendar_links_task_idx ON public.google_calendar_links(task_id);
CREATE INDEX google_calendar_links_user_idx ON public.google_calendar_links(user_id);