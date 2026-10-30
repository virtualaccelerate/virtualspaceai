CREATE TABLE public.personal_assistants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
 name text NOT NULL DEFAULT 'Виэй',
 skills text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, teamspace_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_assistants TO authenticated;
GRANT ALL ON public.personal_assistants TO service_role;
ALTER TABLE public.personal_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_own ON public.personal_assistants FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER pa_updated BEFORE UPDATE ON public.personal_assistants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.reminder_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assistant_id uuid NOT NULL REFERENCES public.personal_assistants(id) ON DELETE CASCADE,
 teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
 sheet_url text NOT NULL,
 title text,
 tabs jsonb NOT NULL DEFAULT '[]',
 column_map jsonb NOT NULL DEFAULT '{}',
 last_checked_at timestamptz,
 last_error text,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reminder_sources TO authenticated;
GRANT ALL ON public.reminder_sources TO service_role;
ALTER TABLE public.reminder_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY rs_own_read ON public.reminder_sources FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.personal_assistants a WHERE a.id = assistant_id AND a.user_id = auth.uid()));

CREATE TABLE public.reminder_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id uuid NOT NULL REFERENCES public.reminder_sources(id) ON DELETE CASCADE,
 row_key text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('birthday','subscription_end','followup')),
 event_date date NOT NULL,
 notified_user_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (source_id, row_key, kind, event_date)
);
GRANT ALL ON public.reminder_log TO service_role;
REVOKE ALL ON public.reminder_log FROM anon, authenticated;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY rl_service ON public.reminder_log FOR ALL TO service_role USING (true) WITH CHECK (true);