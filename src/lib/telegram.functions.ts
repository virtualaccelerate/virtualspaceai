import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .handler(async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
    const { tg, webhookSecret } = await import("@/lib/telegram.server");
    const res = await tg<any>("setWebhook", {
      url: webhookUrl(),
      secret_token: await webhookSecret(token),
      allowed_updates: ["message", "edited_message", "callback_query"],
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
