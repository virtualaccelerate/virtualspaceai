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
