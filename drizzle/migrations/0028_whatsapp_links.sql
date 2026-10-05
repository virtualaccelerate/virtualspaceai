CREATE TABLE public.whatsapp_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE SET NULL,
  link_code text NOT NULL DEFAULT encode(extensions.gen_random_bytes(4),'hex'),
  phone_number text,
  wa_name text,
  language text DEFAULT 'ru',
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_links_phone_unique ON public.whatsapp_links(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX whatsapp_links_code_idx ON public.whatsapp_links(lower(link_code));
GRANT SELECT, DELETE ON public.whatsapp_links TO authenticated;
GRANT ALL ON public.whatsapp_links TO service_role;
ALTER TABLE public.whatsapp_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own whatsapp link select" ON public.whatsapp_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own whatsapp link delete" ON public.whatsapp_links FOR DELETE TO authenticated USING (user_id = auth.uid());