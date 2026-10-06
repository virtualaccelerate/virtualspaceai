-- Documents could be selected/inserted/deleted by teamspace members, but never updated
-- (no FOR UPDATE policy existed), so pin/reorder writes were silently filtered by RLS.
CREATE POLICY "members can update teamspace documents"
ON public.documents
FOR UPDATE TO authenticated
USING (private.is_teamspace_member(teamspace_id, auth.uid()))
WITH CHECK (private.is_teamspace_member(teamspace_id, auth.uid()));
