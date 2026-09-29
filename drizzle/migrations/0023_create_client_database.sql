CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text,
  phone_norm text,
  email text,
  company text,
  notes text,
  status text,
  source_task_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clients_ts_phone_uidx ON public.clients(teamspace_id, phone_norm) WHERE phone_norm IS NOT NULL;
CREATE INDEX clients_ts_idx ON public.clients(teamspace_id);
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.client_db_settings (
  teamspace_id uuid PRIMARY KEY REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  sheet_id text,
  sheet_url text,
  doc_url text,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.client_db_settings TO service_role;
ALTER TABLE public.client_db_settings ENABLE ROW LEVEL SECURITY;