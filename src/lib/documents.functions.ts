import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  teamspace_id: z.string().uuid(),
  name: z.string().min(1).max(300),
  storage_path: z.string().min(1),
  mime_type: z.string().max(200).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  extracted_text: z.string().max(200_000).optional(),
});

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ teamspace_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("documents")
      .select("id, name, storage_path, mime_type, size_bytes, created_at, user_id")
      .eq("teamspace_id", data.teamspace_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        teamspace_id: data.teamspace_id,
        user_id: context.userId,
        name: data.name,
        storage_path: data.storage_path,
        mime_type: data.mime_type,
        size_bytes: data.size_bytes ?? 0,
        extracted_text: data.extracted_text ?? null,
      })
      .select("id, name, storage_path, mime_type, size_bytes, created_at, user_id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: doc, error: fetchErr } = await context.supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!doc) return { ok: true };
    await context.supabase.storage.from("documents").remove([doc.storage_path]);
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, name, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");
    const { data: signed, error: sErr } = await context.supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60 * 10);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, name: doc.name };
  });

// Extract text from PDFs and images using Gemini multimodal.
// Fire-and-forget from the client after upload; updates documents.extracted_text.
export const extractDocumentText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, name, storage_path, mime_type, extracted_text")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");
    if (doc.extracted_text && doc.extracted_text.length > 0) {
      return { ok: true, skipped: true as const };
    }

    const mime = (doc.mime_type || "").toLowerCase();
    const isPdf = mime === "application/pdf" || /\.pdf$/i.test(doc.name);
    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(doc.name);
    if (!isPdf && !isImage) {
      return { ok: true, unsupported: true as const };
    }

    const { data: blob, error: dlErr } = await context.supabase.storage
      .from("documents")
      .download(doc.storage_path);
    if (dlErr || !blob) throw new Error(dlErr?.message || "Download failed");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > 15 * 1024 * 1024) {
      return { ok: true, tooLarge: true as const };
    }

    // Base64 encode
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(bin);
    const effectiveMime = isPdf ? "application/pdf" : (mime || "image/png");
    const dataUrl = `data:${effectiveMime};base64,${b64}`;

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const userContent = isPdf
      ? [
          {
            type: "file",
            file: { filename: doc.name, file_data: dataUrl },
          },
          {
            type: "text",
            text: "Extract ALL readable text from this document verbatim, preserving order. Output plain text only, no commentary.",
          },
        ]
      : [
          { type: "image_url", image_url: { url: dataUrl } },
          {
            type: "text",
            text: "Extract ALL readable text from this image verbatim (OCR). Output plain text only, no commentary.",
          },
        ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an OCR/text extraction tool. Output only the extracted text." },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (res.status === 429) throw new Error("Rate limit exceeded, try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI extract failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = (json.choices?.[0]?.message?.content || "").slice(0, 180_000);

    const { error: upErr } = await context.supabase
      .from("documents")
      .update({ extracted_text: text })
      .eq("id", doc.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, length: text.length };
  });
