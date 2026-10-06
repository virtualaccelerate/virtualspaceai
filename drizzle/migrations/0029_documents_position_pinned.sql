ALTER TABLE public.documents ADD COLUMN position integer;
ALTER TABLE public.documents ADD COLUMN pinned boolean NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY teamspace_id ORDER BY created_at DESC) AS rn
  FROM public.documents
)
UPDATE public.documents d
SET position = r.rn
FROM ranked r
WHERE d.id = r.id;

CREATE INDEX documents_teamspace_pinned_position_idx ON public.documents (teamspace_id, pinned DESC, position ASC);