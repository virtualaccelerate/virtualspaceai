
CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teamspace_id uuid REFERENCES public.teamspaces(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New chat',
  agent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_conversations" ON public.chat_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX chat_conversations_user_updated_idx ON public.chat_conversations(user_id, updated_at DESC);

ALTER TABLE public.chat_messages
  ADD COLUMN conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
CREATE INDEX chat_messages_conversation_idx ON public.chat_messages(conversation_id, created_at);
