ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extract_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS extract_error text;

UPDATE public.documents
SET extract_status = CASE WHEN coalesce(length(extracted_text),0) > 0 THEN 'ready' ELSE 'pending' END
WHERE extract_status = 'pending';

CREATE OR REPLACE FUNCTION public.documents_index_status(p_teamspace uuid)
RETURNS TABLE (id uuid, text_len integer, extract_status text, extract_error text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT d.id, coalesce(length(d.extracted_text), 0)::int, d.extract_status, d.extract_error
  FROM public.documents d
  WHERE d.teamspace_id = p_teamspace
$$;

GRANT EXECUTE ON FUNCTION public.documents_index_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.documents_index_status(uuid) TO service_role;