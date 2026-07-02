import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const demoRequestSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  contact: z.string().trim().min(1, "Contact required").max(200),
  company: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  language: z.string().trim().max(10).optional(),
});

export const submitDemoRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => demoRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: inserted, error } = await supabaseAdmin
      .from("demo_requests")
      .insert({
        name: data.name,
        contact: data.contact,
        company: data.company ?? null,
        language: data.language ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[demo_requests] insert failed", error);
      throw new Error("Failed to save demo request");
    }


    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const escape = (s: string) =>
        s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
      const lines = [
        "<b>🚀 New demo request</b>",
        `<b>Name:</b> ${escape(data.name)}`,
        `<b>Contact:</b> ${escape(data.contact)}`,
        data.company ? `<b>Company:</b> ${escape(data.company)}` : null,
        data.language ? `<b>Lang:</b> ${escape(data.language)}` : null,
      ].filter(Boolean);

      try {
        const res = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: lines.join("\n"),
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          },
        );
        if (!res.ok) {
          console.error("[telegram] sendMessage failed", res.status, await res.text());
        }
      } catch (e) {
        console.error("[telegram] sendMessage error", e);
      }
    } else {
      console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    }

    return { ok: true as const, id: inserted.id };
  });
