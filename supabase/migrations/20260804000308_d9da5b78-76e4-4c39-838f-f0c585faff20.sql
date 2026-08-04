CREATE TABLE public.startups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  description_ru text,
  image_url text,
  website_url text,
  cta_label text,
  tags text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.startups TO anon;
GRANT SELECT ON public.startups TO authenticated;
GRANT ALL ON public.startups TO service_role;

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published startups"
ON public.startups FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE TRIGGER startups_set_updated_at
BEFORE UPDATE ON public.startups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.startups (name, description, description_ru, website_url, position, published) VALUES
('Fusion AI', 'AI sales agent that qualifies leads, answers customer questions and closes deals across your messengers 24/7.', 'AI-агент продаж: квалифицирует лиды, отвечает клиентам и доводит до сделки в мессенджерах 24/7.', 'https://fusionai.kg', 1, true),
('Finik', 'Payment and money-transfer platform for businesses and individuals — QR payments, invoicing and instant settlements.', 'Платёжная платформа для бизнеса и людей: QR-оплата, выставление счетов и мгновенные переводы.', 'https://finik.kg', 2, true);