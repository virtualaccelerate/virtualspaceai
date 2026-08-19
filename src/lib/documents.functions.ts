import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  TEXT_MIME,
  TEXT_EXT,
  toBase64,
  callGateway,
  EXTRACT_SYSTEM_PROMPT,
} from "./documents-extract.server";


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
      .select(
        "id, name, storage_path, mime_type, size_bytes, created_at, user_id, extract_status, extract_error",
      )
      .eq("teamspace_id", data.teamspace_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: stats } = await context.supabase.rpc("documents_index_status", {
      p_teamspace: data.teamspace_id,
    });
    const lenById = new Map<string, number>(
      ((stats ?? []) as { id: string; text_len: number }[]).map((s) => [s.id, s.text_len]),
    );
    return (rows ?? []).map((r) => ({ ...r, text_len: lenById.get(r.id) ?? 0 }));
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

// ---- Text extraction (PDF / images / plain text) ----------------------------



/**
 * Extract text from a stored document and save it to documents.extracted_text.
 * Handles plain-text files locally and PDFs/images through Gemini multimodal OCR,
 * continuing in a second pass when the model truncates a long document.
 */
export const extractDocumentText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), force: z.boolean().optional() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const setStatus = async (status: string, err?: string | null, text?: string) => {
      const patch: {
        extract_status: string;
        extract_error: string | null;
        extracted_text?: string;
      } = { extract_status: status, extract_error: err ?? null };
      if (typeof text === "string") patch.extracted_text = text;
      await context.supabase.from("documents").update(patch).eq("id", data.id);
    };


    const { data: doc, error } = await context.supabase
      .from("documents")
      .select("id, name, storage_path, mime_type, extracted_text")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");

    if (!data.force && doc.extracted_text && doc.extracted_text.length > 0) {
      return { ok: true, skipped: true as const, length: doc.extracted_text.length };
    }

    try {
      await setStatus("processing");

      const mime = (doc.mime_type || "").toLowerCase();
      const isPdf = mime === "application/pdf" || /\.pdf$/i.test(doc.name);
      const isImage =
        mime.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(doc.name);
      const isText = TEXT_MIME.test(mime) || TEXT_EXT.test(doc.name);

      if (!isPdf && !isImage && !isText) {
        await setStatus(
          "unsupported",
          "Формат не поддерживается для автоматического чтения (поддерживаются PDF, изображения и текстовые файлы). Экспортируйте файл в PDF и загрузите снова.",
        );
        return { ok: false, unsupported: true as const };
      }

      const { data: blob, error: dlErr } = await context.supabase.storage
        .from("documents")
        .download(doc.storage_path);
      if (dlErr || !blob) throw new Error(dlErr?.message || "Не удалось скачать файл из хранилища");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength === 0) throw new Error("Файл пустой");

      if (isText) {
        const text = new TextDecoder().decode(bytes).slice(0, 180_000);
        await setStatus(text.trim() ? "ready" : "empty", text.trim() ? null : "В файле нет текста", text);
        return { ok: true, length: text.length };
      }

      if (bytes.byteLength > 15 * 1024 * 1024) {
        await setStatus("too_large", "Файл больше 15 МБ — разделите его на части.");
        return { ok: false, tooLarge: true as const };
      }

      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Missing LOVABLE_API_KEY");

      const effectiveMime = isPdf ? "application/pdf" : mime || "image/png";
      const dataUrl = `data:${effectiveMime};base64,${toBase64(bytes)}`;
      const mediaBlock = isPdf
        ? { type: "file", file: { filename: doc.name, file_data: dataUrl } }
        : { type: "image_url", image_url: { url: dataUrl } };

      const system = EXTRACT_SYSTEM_PROMPT;


      let text = (
        await callGateway(key, {
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                mediaBlock,
                {
                  type: "text",
                  text: "Extract ALL text from this document from the very beginning to the very end.",
                },
              ],
            },
          ],
        })
      ).trim();

      // Continuation pass when the model appears to stop early on a long document.
      for (let pass = 0; pass < 2 && text.length > 6000; pass++) {
        const tail = text.slice(-1200);
        const more = (
          await callGateway(key, {
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content: [
                  mediaBlock,
                  {
                    type: "text",
                    text: `Continue extracting this document strictly AFTER the following already-extracted fragment. If nothing remains, answer exactly END.\n\n---\n${tail}\n---`,
                  },
                ],
              },
            ],
          })
        ).trim();
        if (!more || /^END\b/i.test(more) || more.length < 40) break;
        text = `${text}\n${more}`;
        if (text.length > 180_000) break;
      }

      text = text.slice(0, 180_000);
      if (!text.trim()) {
        await setStatus("empty", "ИИ не нашёл текста в файле (возможно, это скан низкого качества).");
        return { ok: false, empty: true as const };
      }

      await setStatus("ready", null, text);
      return { ok: true, length: text.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Extraction failed";
      await setStatus("failed", msg.slice(0, 500));
      throw new Error(msg);
    }
  });

/** Re-run extraction for every document in a teamspace that has no usable text. */
export const reindexTeamspaceDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ teamspace_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: stats, error } = await context.supabase.rpc("documents_index_status", {
      p_teamspace: data.teamspace_id,
    });
    if (error) throw new Error(error.message);
    const pending = ((stats ?? []) as { id: string; text_len: number }[]).filter(
      (s) => s.text_len === 0,
    );
    return { pending: pending.map((p) => p.id) };
  });
