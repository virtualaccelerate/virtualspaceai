import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function appBase(): string {
  return (
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://ai-virtualspace.com"
  );
}

function webhookUrl(): string {
  return `${appBase()}/api/public/telegram/webhook`;
}

function miniAppUrl(): string {
  return `${appBase()}/tg`;
}



/** Current Telegram link state + bot username for the connect deep link. */
export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: link } = await supabaseAdmin
      .from("telegram_links")
      .select("link_code, chat_id, telegram_username, linked_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!link) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("current_teamspace_id, language")
        .eq("id", context.userId)
        .maybeSingle();
      const { data: created } = await supabaseAdmin
        .from("telegram_links")
        .insert({
          user_id: context.userId,
          teamspace_id: (profile as any)?.current_teamspace_id ?? null,
          language: (profile as any)?.language ?? "ru",
        })
        .select("link_code, chat_id, telegram_username, linked_at")
        .single();
      link = created;
    }

    let botUsername: string | null = null;
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const { tg } = await import("@/lib/telegram.server");
        const me = await tg<any>("getMe", {});
        botUsername = me?.result?.username ?? null;
      } catch {
        botUsername = null;
      }
    }

    return {
      code: (link as any)?.link_code ?? null,
      connected: Boolean((link as any)?.chat_id),
      telegramUsername: (link as any)?.telegram_username ?? null,
      linkedAt: (link as any)?.linked_at ?? null,
      botUsername,
      miniAppUrl: miniAppUrl(),
    };
  });

/** Registers the Telegram webhook + mini app menu button for this deployment. */
export const setupTelegramWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspaceId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: membership, error } = await context.supabase.from("teamspace_members")
      .select("role").eq("teamspace_id", data.teamspaceId).eq("user_id", context.userId).maybeSingle();
    const { canSetupWorkspaceBot } = await import("./reminder-rules");
    if (error || !canSetupWorkspaceBot(membership?.role)) throw new Error("Только владелец пространства может настроить бота");
    const { requireApplicationAdmin } = await import("./application-admin.server");
    await requireApplicationAdmin();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
    const { tg, webhookSecret } = await import("@/lib/telegram.server");
    const res = await tg<any>("setWebhook", {
      url: webhookUrl(),
      secret_token: await webhookSecret(token),
      allowed_updates: ["message", "edited_message", "callback_query", "my_chat_member"],
      drop_pending_updates: true,
    });
    await tg("setMyCommands", {
      commands: [
        { command: "start", description: "Connect account / Привязать аккаунт" },
        { command: "app", description: "Open mini app / Открыть приложение" },
        { command: "tasks", description: "Open tasks / Активные задачи" },
        { command: "new", description: "New task / Новая задача" },
        { command: "done", description: "Complete task / Завершить задачу" },
        { command: "report", description: "Report day|week|month / Отчёт" },
        { command: "help", description: "Help / Помощь" },
        { command: "unlink", description: "Disconnect / Отвязать" },
      ],
    });
    const menu = await tg<any>("setChatMenuButton", {
      menu_button: {
        type: "web_app",
        text: "Virtual Space",
        web_app: { url: miniAppUrl() },
      },
    });
    return {
      ok: Boolean(res?.ok),
      url: webhookUrl(),
      miniApp: miniAppUrl(),
      miniAppOk: Boolean(menu?.ok),
      error: res?.description ?? menu?.description ?? null,
    };
  });


/** Unlinks Telegram and rotates the connect code. */
export const unlinkTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("telegram_links")
      .delete()
      .eq("user_id", context.userId);
    return { ok: true };
  });

async function requireManager(context: any, teamspaceId: string) {
  const { data: m } = await context.supabase.from("teamspace_members")
    .select("role").eq("teamspace_id", teamspaceId).eq("user_id", context.userId).maybeSingle();
  const { canLinkGroup } = await import("./telegram-groups");
  if (!canLinkGroup(m?.role)) throw new Error("Только владелец или администратор пространства");
}

/** Linked groups of the workspace + the project directory, managers only. */
export const listTelegramGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspaceId: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await requireManager(context, data.teamspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: groups }, { data: projects }] = await Promise.all([
      db.from("telegram_groups").select("id, title, project, status, bot_is_admin").eq("teamspace_id", data.teamspaceId).order("created_at"),
      db.from("projects").select("name").eq("teamspace_id", data.teamspaceId).order("name"),
    ]);
    const rows = await Promise.all((groups ?? []).map(async (g: any) => {
      const { data: last } = await db.from("telegram_group_messages").select("sent_at").eq("group_id", g.id).order("sent_at", { ascending: false }).limit(1).maybeSingle();
      return { ...g, lastMessageAt: (last?.sent_at as string | undefined) ?? null };
    }));
    return { groups: rows as { id: string; title: string | null; project: string | null; status: string; bot_is_admin: boolean; lastMessageAt: string | null }[],
      projects: (projects ?? []).map((p: any) => p.name as string) };
  });

/** Links a group (by the one-time code posted in the group) to the workspace + project. */
export const linkTelegramGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspaceId: z.string().uuid(), code: z.string().min(4).max(32), project: z.string().max(200).nullable() }).parse(raw))
  .handler(async ({ context, data }) => {
    await requireManager(context, data.teamspaceId);
    const { normalizeGroupCode } = await import("./telegram-groups");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: group } = await db.from("telegram_groups").select("id, status").eq("link_code", normalizeGroupCode(data.code)).maybeSingle();
    if (!group || group.status === "left") throw new Error("Код не найден");
    if (data.project) {
      const { data: p } = await db.from("projects").select("name").eq("teamspace_id", data.teamspaceId).eq("name", data.project).maybeSingle();
      if (!p) throw new Error("Проект не найден");
    }
    const { error } = await db.from("telegram_groups").update({ teamspace_id: data.teamspaceId, project: data.project, status: "linked", linked_by: context.userId, link_code: null }).eq("id", group.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
