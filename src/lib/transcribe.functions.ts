import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  audio_base64: z.string().min(1).max(20_000_000),
  mime_type: z.string().min(1).max(100),
  teamspace_id: z.string().uuid().optional(),
  duration_ms: z.number().nonnegative().max(301000).optional(),
  language: z.string().min(2).max(10).optional(),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { transcribeSpeech } = await import("./stt.server");
    return transcribeSpeech({
      user_id: context.userId, teamspace_id: data.teamspace_id, source: "web",
      audio: new Uint8Array(Buffer.from(data.audio_base64, "base64")),
      mime_type: data.mime_type, duration_ms: data.duration_ms, language: data.language,
    });
  });
