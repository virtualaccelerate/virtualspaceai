ALTER TABLE public.teamspaces ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#18866b';
ALTER TABLE public.telegram_links ADD COLUMN IF NOT EXISTS kp_conversation_id uuid;
CREATE TABLE public.commercial_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 client text NOT NULL DEFAULT '',
 title text NOT NULL DEFAULT '',
 language text NOT NULL DEFAULT 'ru',
 slides jsonb NOT NULL DEFAULT '[]'::jsonb,
 pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
 brand_color text NOT NULL DEFAULT '#18866b',
 logo_path text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_proposals TO authenticated;
GRANT ALL ON public.commercial_proposals TO service_role;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY kp_member_read ON public.commercial_proposals FOR SELECT TO authenticated USING (private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY kp_creator_insert ON public.commercial_proposals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY kp_creator_update ON public.commercial_proposals FOR UPDATE TO authenticated USING (created_by = auth.uid() AND private.is_teamspace_member(teamspace_id, auth.uid())) WITH CHECK (created_by = auth.uid() AND private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE POLICY kp_creator_delete ON public.commercial_proposals FOR DELETE TO authenticated USING (created_by = auth.uid() AND private.is_teamspace_member(teamspace_id, auth.uid()));
CREATE INDEX kp_workspace_created ON public.commercial_proposals(teamspace_id, created_at DESC);
CREATE TRIGGER kp_updated BEFORE UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE FUNCTION public.kp_guard_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.teamspace_id IS DISTINCT FROM OLD.teamspace_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Proposal identity is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER kp_identity BEFORE UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.kp_guard_identity();