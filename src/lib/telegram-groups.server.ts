// Server-only: Telegram group membership + message capture. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendMessage } from "./telegram.server";
import { isAfterBotAdded, isGroupChat, newGroupLinkCode } from "./telegram-groups";

const db = supabaseAdmin as any;

/** Returns true when the update belonged to a group and was handled here. */
export async function handleGroupUpdate(update: any): Promise<boolean> {
  if (update.my_chat_member) {
    const m = update.my_chat_member;
    if (!isGroupChat(m.chat)) return false;
    await onMembership(m.chat, m.old_chat_member?.status, m.new_chat_member?.status);
    return true;
  }
  const message = update.message ?? update.edited_message;
  if (!message || !isGroupChat(message.chat)) return false;
  if (message.migrate_to_chat_id) {
    await db.from("telegram_groups").update({ chat_id: message.migrate_to_chat_id }).eq("chat_id", message.chat.id);
    return true;
  }
  if (message.migrate_from_chat_id) return true;
  await storeMessage(message);
  return true;
}

async function onMembership(chat: any, oldStatus?: string, newStatus?: string) {
  const present = ["member", "administrator", "creator", "restricted"];
  const { data: existing } = await db.from("telegram_groups").select("id, status, link_code").eq("chat_id", chat.id).maybeSingle();
  if (newStatus === "left" || newStatus === "kicked") {
    if (existing) await db.from("telegram_groups").update({ status: "left", bot_is_admin: false }).eq("id", existing.id);
    return;
  }
  if (!newStatus || !present.includes(newStatus)) return;
  const isAdmin = newStatus === "administrator";
  const justAdded = !existing || existing.status === "left" || !present.includes(oldStatus ?? "");
  if (!justAdded) {
    await db.from("telegram_groups").update({ bot_is_admin: isAdmin, title: chat.title ?? null }).eq("id", existing.id);
    return;
  }
  const code = newGroupLinkCode();
  const row = { chat_id: chat.id, title: chat.title ?? null, bot_added_at: new Date().toISOString(), bot_is_admin: isAdmin, link_code: code,
    status: existing?.status === "linked" ? "linked" : "pending" };
  await db.from("telegram_groups").upsert(row, { onConflict: "chat_id" });
  await sendMessage(chat.id, `Задачи ведутся с этого момента. Назначьте меня администратором, чтобы я видел все сообщения.\n\nКод привязки: ${code}\nВведите его на странице Telegram → «Группы» в Virtual Space.`);
}

async function storeMessage(message: any) {
  const { data: group } = await db.from("telegram_groups").select("id, bot_added_at, status").eq("chat_id", message.chat.id).maybeSingle();
  if (!group || group.status === "left") return;
  if (!isAfterBotAdded(message.date, group.bot_added_at)) return;
  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) return;
  const from = message.from ?? {};
  await db.from("telegram_group_messages").upsert({
    group_id: group.id, chat_id: message.chat.id, message_id: message.message_id,
    from_id: from.id ?? null, from_username: from.username ?? null,
    author_name: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
    text, sent_at: new Date(message.date * 1000).toISOString(),
  }, { onConflict: "chat_id,message_id" });
}
