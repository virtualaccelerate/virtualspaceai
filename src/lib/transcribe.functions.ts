import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  audio_base64: z.string().min(1).max(20_000_000),
  mime_type: z.string().min(1).max(100),
  language: z.string().min(2).max(10).optional(),
});

const extForMime = (m: string): string => {
  const base = m.split(";")[0].toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
  };
  return map[base] ?? "webm";
};

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const bin = Buffer.from(data.audio_base64, "base64");
    if (bin.byteLength < 512) throw new Error("Recording too short — please try again.");

    const ext = extForMime(data.mime_type);
    const blob = new Blob([bin], { type: data.mime_type });
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", blob, `recording.${ext}`);
    if (data.language) form.append("language", data.language);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please top up in workspace settings.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Transcription failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
