CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  photo_url text,
  role_title text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  short_bio text NOT NULL DEFAULT '',
  full_bio text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  achievements text NOT NULL DEFAULT '',
  topics text NOT NULL DEFAULT '',
  expertise text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric(10,2),
  currency text NOT NULL DEFAULT 'USD',
  booking_url text,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mentors TO anon;
GRANT SELECT ON public.mentors TO authenticated;
GRANT ALL ON public.mentors TO service_role;

ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published mentors"
ON public.mentors FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE TRIGGER mentors_set_updated_at
BEFORE UPDATE ON public.mentors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();