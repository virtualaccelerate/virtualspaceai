
CREATE TABLE public.financial_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teamspace_id UUID NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.financial_chat_messages TO authenticated;
GRANT ALL ON public.financial_chat_messages TO service_role;

ALTER TABLE public.financial_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view teamspace fin chat"
  ON public.financial_chat_messages FOR SELECT
  TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE POLICY "Members can insert fin chat"
  ON public.financial_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_teamspace_member(teamspace_id, auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Members can delete teamspace fin chat"
  ON public.financial_chat_messages FOR DELETE
  TO authenticated
  USING (public.is_teamspace_member(teamspace_id, auth.uid()));

CREATE INDEX idx_fin_chat_ts_created ON public.financial_chat_messages(teamspace_id, created_at);
