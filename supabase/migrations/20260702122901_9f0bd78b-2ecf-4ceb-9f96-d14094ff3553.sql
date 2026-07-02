
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  company TEXT,
  language TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.demo_requests TO anon;
GRANT SELECT, INSERT ON public.demo_requests TO authenticated;
GRANT ALL ON public.demo_requests TO service_role;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(name)) BETWEEN 1 AND 120
    AND length(trim(contact)) BETWEEN 1 AND 200
    AND (company IS NULL OR length(company) <= 200)
  );

CREATE POLICY "Authenticated users can read demo requests"
  ON public.demo_requests FOR SELECT
  TO authenticated
  USING (true);
