import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  TEXT_MIME,
  TEXT_EXT,
  SPREADSHEET_MIME,
  SPREADSHEET_EXT,
  PRESENTATION_MIME,
  PRESENTATION_EXT,
  extractSpreadsheetText,
  extractPresentationText,
  fetchWebpageText,
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
  project: z.string().max(200).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

const LinkSchema = z.object({
  teamspace_id: z.string().uuid(),
  url: z.string().url().max(2000),
  name: z.string().max(300).optional(),
  note: z.string().max(5000).optional(),
  project: z.string().max(200).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

export const createLinkDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => LinkSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { detectLinkKind, LINK_LABEL } = await import("./links");
    const kind = detectLinkKind(data.url);
    const name = data.name?.trim() || `${LINK_LABEL[kind]} — ${new URL(data.url).hostname}`;
    const header = [name, data.url, data.project ? `Project: ${data.project}` : "", data.tags?.length ? `Tags: ${data.tags.join(", ")}` : "", data.note ?? ""]
      .filter(Boolean).join("\n");

    // A plain website link (not an app we only know how to label, like Trello
    // or Google Sheets) can actually be read — fetch and store its page text
    // so the AI can answer questions from it, not just see the URL.
    let text = header;
    let extractStatus = "ready";
    if (kind === "web") {
      const page = await fetchWebpageText(data.url).catch(() => null);
      if (page) {
        text = `${header}\n\n---\n\n${page}`;
      } else {
        extractStatus = "failed";
      }
    }

    const { data: row, error } = await context.supabase
      .from("documents")
      .insert({
        teamspace_id: data.teamspace_id,
        user_id: context.userId,
        name,
        storage_path: "",
        mime_type: "text/uri-list",
        size_bytes: 0,
        url: data.url,
        link_kind: kind,
        project: data.project?.trim() || null,
        tags: data.tags ?? [],
        extracted_text: text,
        extract_status: extractStatus,
        extract_error: extractStatus === "failed" ? "Не удалось прочитать содержимое страницы (сайт недоступен или блокирует автоматический доступ)." : null,
      })
      .select("id, name, storage_path, mime_type, size_bytes, created_at, user_id, url, link_kind, project, tags, extract_status")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, text_len: text.length };
  });

export const getLinkDocumentTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ url: z.string().url().max(2000) }).parse(raw))
  .handler(async ({ data }) => {
    const { fetchWebpageTitle } = await import("./documents-extract.server");
    return { title: await fetchWebpageTitle(data.url) };
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
        "id, name, storage_path, mime_type, size_bytes, created_at, user_id, extract_status, extract_error, url, link_kind, project, tags, pinned, position",
      )
      .eq("teamspace_id", data.teamspace_id)
      .order("pinned", { ascending: false })
      .order("position", { ascending: true, nullsFirst: false })
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

export const reorderDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await context.supabase
        .from("documents")
        .update({ position: i + 1 })
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const togglePinDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: doc, error: fetchErr } = await context.supabase
      .from("documents")
      .select("id, pinned")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!doc) throw new Error("Document not found");
    const { error } = await context.supabase
      .from("documents")
      .update({ pinned: !doc.pinned })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, pinned: !doc.pinned };
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
        project: data.project?.trim() || null,
        tags: data.tags ?? [],
      })
      .select("id, name, storage_path, mime_type, size_bytes, created_at, user_id, url, link_kind, project, tags")
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
    if (doc.storage_path) await context.supabase.storage.from("documents").remove([doc.storage_path]);
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
      .select("id, name, storage_path, url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");
    if (doc.url) return { url: doc.url, name: doc.name };
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
      .select("id, name, storage_path, mime_type, extracted_text, url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");
    if (doc.url) return { ok: true, skipped: true as const, length: doc.extracted_text?.length ?? 0 };

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
      const isSpreadsheet = SPREADSHEET_MIME.test(mime) || SPREADSHEET_EXT.test(doc.name);
      const isLegacyPresentation = /\.(ppt|odp)$/i.test(doc.name) || /vnd\.ms-powerpoint|vnd\.oasis\.opendocument\.presentation/i.test(mime);
      const isPresentation = (PRESENTATION_MIME.test(mime) || PRESENTATION_EXT.test(doc.name)) && !isLegacyPresentation;

      if (isLegacyPresentation) {
        await setStatus(
          "unsupported",
          "Старый формат .ppt/.odp не поддерживается — пересохраните презентацию в .pptx.",
        );
        return { ok: false, unsupported: true as const };
      }

      if (!isPdf && !isImage && !isText && !isSpreadsheet && !isPresentation) {
        await setStatus(
          "unsupported",
          "Формат не поддерживается для автоматического чтения (поддерживаются PDF, изображения, таблицы, презентации .pptx и текстовые файлы).",
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

      if (isSpreadsheet) {
        const text = await extractSpreadsheetText(bytes);
        await setStatus(text.trim() ? "ready" : "empty", text.trim() ? null : "В таблице нет данных", text);
        return { ok: true, length: text.length };
      }

      if (isPresentation) {
        const text = await extractPresentationText(bytes);
        await setStatus(text.trim() ? "ready" : "empty", text.trim() ? null : "В презентации нет текста", text);
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
