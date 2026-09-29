ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS link_kind text,
  ADD COLUMN IF NOT EXISTS project text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS documents_teamspace_project_idx ON public.documents (teamspace_id, lower(project));