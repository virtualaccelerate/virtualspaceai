ALTER TABLE public.telegram_groups ADD COLUMN provider text NOT NULL DEFAULT 'telegram', ADD COLUMN external_chat_id text;
ALTER TABLE public.telegram_groups ALTER COLUMN chat_id DROP NOT NULL;
ALTER TABLE public.telegram_groups ADD CONSTRAINT telegram_groups_provider_external_uniq UNIQUE (provider, external_chat_id);
ALTER TABLE public.telegram_group_messages ADD COLUMN provider text NOT NULL DEFAULT 'telegram', ADD COLUMN external_message_id text, ADD COLUMN sender_jid text;
ALTER TABLE public.telegram_group_messages ALTER COLUMN chat_id DROP NOT NULL;
ALTER TABLE public.telegram_group_messages ADD CONSTRAINT telegram_group_messages_provider_external_uniq UNIQUE (provider, external_message_id);