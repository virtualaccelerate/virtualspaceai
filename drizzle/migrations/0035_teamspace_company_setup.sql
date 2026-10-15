ALTER TABLE public.teamspaces
  ADD COLUMN company_size text,
  ADD COLUMN industry text,
  ADD COLUMN priorities text[] DEFAULT '{}';