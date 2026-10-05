import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Current WhatsApp link state + wa.me deep link (when the bot number is configured). */
export const getWhatsAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cols = "link_code, phone_number, wa_name, linked_at";

    let { data: link } = await supabaseAdmin
      .from("whatsapp_links")
      .select(cols)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!link) {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("current_teamspace_id, language")
        .eq("id", context.userId)
        .maybeSingle();
      const { data: created } = await supabaseAdmin
        .from("whatsapp_links")
        .insert({
          user_id: context.userId,
          teamspace_id: (profile as any)?.current_teamspace_id ?? null,
          language: (profile as any)?.language ?? "ru",
        })
        .select(cols)
        .single();
      link = created;
    }

    const code = link?.link_code ?? null;
    const display = process.env.WHATSAPP_DISPLAY_PHONE_NUMBER?.replace(/[^\d]/g, "");
    const configured = Boolean(
      display && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
    );
    return {
      code,
      connected: Boolean(link?.linked_at && link?.phone_number),
      phoneNumber: link?.phone_number ?? null,
      waName: link?.wa_name ?? null,
      linkedAt: link?.linked_at ?? null,
      waLink: configured && code ? `https://wa.me/${display}?text=${encodeURIComponent(code)}` : null,
    };
  });

/** Unlinks WhatsApp; a fresh code is generated on next visit. */
export const unlinkWhatsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("whatsapp_links").delete().eq("user_id", context.userId);
    return { ok: true };
  });
