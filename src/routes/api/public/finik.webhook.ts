import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  purchaseId: z.string().uuid(),
  status: z.enum(["paid", "failed", "pending"]),
  reference: z.string().max(200).optional(),
});

function verify(signature: string | null, body: string, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/finik/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["FINIK_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        if (!verify(request.headers.get("x-finik-signature"), body, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const parsed = payloadSchema.safeParse(JSON.parse(body));
        if (!parsed.success) return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("course_purchases")
          .update({
            status: parsed.data.status,
            provider_ref: parsed.data.reference ?? null,
            paid_at: parsed.data.status === "paid" ? new Date().toISOString() : null,
          })
          .eq("id", parsed.data.purchaseId);

        if (error) return new Response("Update failed", { status: 500 });
        return new Response("ok");
      },
    },
  },
});
