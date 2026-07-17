import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Upload, FileText, Trash2, Loader2, Download, File as FileIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  getDocumentSignedUrl,
  extractDocumentText,
} from "@/lib/documents.functions";

export const Route = createFileRoute("/_authenticated/app/docs")({
  component: KnowledgeBase,
  head: () => ({
    meta: [{ title: "Knowledge Base — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

type Doc = {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  user_id: string;
};

const TEXT_MIMES = /^(text\/|application\/(json|xml|x-yaml|yaml|javascript|typescript|sql|csv|markdown))/i;
const TEXT_EXTS = /\.(txt|md|markdown|csv|tsv|json|xml|yml|yaml|html|htm|js|ts|tsx|jsx|py|sql|log|rtf)$/i;

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function KnowledgeBase() {
  const { t } = useTranslation();
  const list = useServerFn(listDocuments);
  const create = useServerFn(createDocument);
  const remove = useServerFn(deleteDocument);
  const sign = useServerFn(getDocumentSignedUrl);
  const extract = useServerFn(extractDocumentText);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [teamspaceId, setTeamspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [indexing, setIndexing] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { data: mem } = await supabase
          .from("teamspace_members")
          .select("teamspace_id")
          .eq("user_id", data.user.id)
          .limit(1)
          .maybeSingle();
        if (!mem) return;
        setTeamspaceId(mem.teamspace_id);
        const rows = await list({ data: { teamspace_id: mem.teamspace_id } });
        setDocs(rows as Doc[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFiles = async (files: FileList | File[]) => {
    if (!teamspaceId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) {
          setError(`${file.name}: max 25 MB`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\- ]/g, "_");
        const path = `${teamspaceId}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw new Error(upErr.message);

        let extracted: string | undefined;
        if (TEXT_MIMES.test(file.type) || TEXT_EXTS.test(file.name)) {
          try {
            const txt = await file.text();
            extracted = txt.slice(0, 100_000);
          } catch { /* ignore */ }
        }

        const row = await create({
          data: {
            teamspace_id: teamspaceId,
            name: file.name,
            storage_path: path,
            mime_type: file.type || undefined,
            size_bytes: file.size,
            extracted_text: extracted,
          },
        });
        setDocs((prev) => [row as Doc, ...prev]);
        // Fire-and-forget: OCR/PDF text extraction via Gemini for supported binaries.
        if (!extracted && row?.id) {
          const mime = (file.type || "").toLowerCase();
          const eligible =
            mime === "application/pdf" ||
            mime.startsWith("image/") ||
            /\.(pdf|png|jpe?g|webp|gif|heic)$/i.test(file.name);
          if (eligible) {
            extract({ data: { id: row.id } }).catch(() => { /* silent */ });
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const openDoc = async (id: string) => {
    try {
      const { url } = await sign({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open file");
    }
  };

  const removeDoc = async (id: string) => {
    if (!confirm(t("app.docs.confirmDelete", "Delete this file?"))) return;
    try {
      await remove({ data: { id } });
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-white">
            {t("app.docs.title", "Knowledge Base")}
          </h1>
          <p className="text-sm text-white/60">
            {t("app.docs.subtitle", "Upload files — Virtual Space AI will read them and answer using their content.")}
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? "border-primary bg-primary/10"
            : "border-white/15 bg-white/5 hover:bg-white/10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
          <div className="text-sm text-white/90 font-medium">
            {uploading
              ? t("app.docs.uploading", "Uploading…")
              : t("app.docs.dropHere", "Drag & drop files here, or click to choose")}
          </div>
          <div className="text-xs text-white/50">
            {t("app.docs.hint", "PDF, DOCX, TXT, CSV, MD, JSON — up to 25 MB each")}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[color:var(--card)] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">
            {t("app.docs.files", "Files")} <span className="text-white/40 font-normal">({docs.length})</span>
          </div>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-white/50 text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("app.docs.loading", "Loading…")}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/50">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t("app.docs.empty", "No files yet. Upload your first document above.")}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <FileIcon className="h-4 w-4 text-white/60" />
                </div>
                <button
                  onClick={() => openDoc(d.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm text-white truncate group-hover:underline">{d.name}</div>
                  <div className="text-xs text-white/40 truncate">
                    {formatBytes(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </button>
                <button
                  onClick={() => openDoc(d.id)}
                  className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition"
                  aria-label="Open"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeDoc(d.id)}
                  className="p-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
