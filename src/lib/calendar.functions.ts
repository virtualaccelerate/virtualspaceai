import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Personal ICS feed URL for the signed-in user's tasks with deadlines. */
export const getCalendarFeedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("calendar_token")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const token = (data as any)?.calendar_token as string | undefined;
    if (!token) throw new Error("Calendar token is not available yet");

    const request = getRequest();
    const base =
      process.env["PUBLIC_APP_URL"]?.replace(/\/$/, "") ??
      (request ? new URL(request.url).origin : "https://ai-virtualspace.com");
    return { url: `${base}/api/public/calendar/${token}` };
  });

/** Daily Telegram digest preferences for the signed-in user. */
export const getDigestSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("telegram_links")
      .select("daily_digest, digest_hour, chat_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      enabled: (data as any)?.daily_digest ?? true,
      hour: (data as any)?.digest_hour ?? 4,
      linked: !!(data as any)?.chat_id,
    };
  });

export const setDigestSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean; hour: number }) => ({
    enabled: !!data.enabled,
    hour: Math.min(23, Math.max(0, Math.round(data.hour))),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("telegram_links")
      .update({ daily_digest: data.enabled, digest_hour: data.hour })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
