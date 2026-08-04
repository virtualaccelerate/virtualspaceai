CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ru text,
  description text NOT NULL DEFAULT '',
  description_ru text,
  cover_url text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KGS',
  level text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  lessons_count integer NOT NULL DEFAULT 0,
  video_url text,
  finik_payment_url text,
  position integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KGS',
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'finik',
  provider_ref text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

GRANT SELECT, INSERT ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;

ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.course_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own purchases"
  ON public.course_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE TRIGGER course_purchases_set_updated_at
  BEFORE UPDATE ON public.course_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX course_purchases_user_idx ON public.course_purchases(user_id);
CREATE INDEX courses_position_idx ON public.courses(position);