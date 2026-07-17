import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Mic, Loader2, FileText, CheckSquare } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { askZukha } from "@/lib/ai-chat.functions";
import { getDocumentSignedUrl } from "@/lib/documents.functions";
import { createTask } from "@/lib/tasks.functions";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";


export const Route = createFileRoute("/_authenticated/app/")({
  component: HomeChat,
  head: () => ({
    meta: [
      { title: "Home — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type ChatMsg = { role: "user" | "assistant"; content: string };

const FILE_TOKEN = /\[\[file:([0-9a-f-]{36})\|([^\]]+)\]\]/gi;

const stripMarkdown = (s: string) =>
  s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/(?<!\[)_([^_\n]+)_(?!\])/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ");

function MessageContent({ text, onOpenFile }: { text: string; onOpenFile: (id: string) => void }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(FILE_TOKEN.source, "gi");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const id = m[1];
    const name = m[2];
    nodes.push(
      <button
        key={`${id}-${m.index}`}
        onClick={() => onOpenFile(id)}
        className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary hover:bg-primary/25 px-1.5 py-0.5 text-xs font-medium align-baseline mx-0.5 transition"
      >
        <FileText className="h-3 w-3" />
        {name}
      </button>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function HomeChat() {
  const { t } = useTranslation();
  const ask = useServerFn(askZukha);
  const sign = useServerFn(getDocumentSignedUrl);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamspaceId, setTeamspaceId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: mem } = await supabase
        .from("teamspace_members")
        .select("teamspace_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();
      if (mem?.teamspace_id) setTeamspaceId(mem.teamspace_id);
    })();
  }, []);

  const openFile = async (id: string) => {
    try {
      const { url } = await sign({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open file");
    }
  };

  const suggestionsRaw = t("app.overview.suggestions", { returnObjects: true });
  const suggestions: string[] = Array.isArray(suggestionsRaw) ? (suggestionsRaw as string[]) : [];

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next, teamspace_id: teamspaceId } });
      setMessages([...next, { role: "assistant", content: stripMarkdown(res.reply || "…") }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };


  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const empty = messages.length === 0;

  return (
    <div className="h-[calc(100vh-3.5rem-2rem)] sm:h-[calc(100vh-3.5rem-3rem)] max-w-3xl mx-auto flex flex-col">
      {/* Transcript / hero */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            {/* Orbital logo animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative w-48 h-48 sm:w-56 sm:h-56"
            >
              {/* Ambient glow */}
              <div
                className="absolute inset-6 rounded-full blur-3xl opacity-60 pointer-events-none"
                style={{ background: "radial-gradient(circle, oklch(0.80 0.22 138 / 0.45), transparent 65%)" }}
              />

              {/* Outer rotating ring with dots */}
              <motion.svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full text-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 6" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <circle key={`o-${angle}`} cx={200 + 190 * Math.cos(rad)} cy={200 + 190 * Math.sin(rad)} r="5" fill="currentColor" />
                  );
                })}
              </motion.svg>

              {/* Middle counter-rotating ring */}
              <motion.svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full text-primary"
                animate={{ rotate: -360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
                {[22.5, 112.5, 202.5, 292.5].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <circle key={`m-${angle}`} cx={200 + 140 * Math.cos(rad)} cy={200 + 140 * Math.sin(rad)} r="4" fill="currentColor" opacity="0.9" />
                  );
                })}
              </motion.svg>

              {/* Inner rotating ring */}
              <motion.svg
                viewBox="0 0 400 400"
                className="absolute inset-0 w-full h-full text-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                <circle cx="200" cy="200" r="95" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
                {[0, 120, 240].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  return (
                    <circle key={`i-${angle}`} cx={200 + 95 * Math.cos(rad)} cy={200 + 95 * Math.sin(rad)} r="3.5" fill="currentColor" />
                  );
                })}
              </motion.svg>

              {/* Center: floating logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-70"
                    style={{ background: "radial-gradient(circle, oklch(0.80 0.22 138 / 0.6), transparent 70%)" }}
                  />
                  <VirtualSpaceLogo size={72} className="relative drop-shadow-[0_10px_30px_oklch(0.80_0.22_138_/_0.5)]" />
                </motion.div>
              </div>
            </motion.div>

            <h1 className="mt-6 font-display text-3xl sm:text-4xl text-white">
              Virtual Space
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-md">
              {t("app.overview.askZukhaSubtitle")}
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  onClick={() => send(s)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2.5 text-xs text-white/80"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "text-white/90"
                    }`}
                  >
                    {m.role === "assistant"
                      ? <MessageContent text={m.content} onOpenFile={openFile} />
                      : m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("app.overview.thinking")}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-2 text-xs text-red-400">{error}</div>
      )}

      {/* Composer */}
      <div className="relative mt-3">
        <div className="pointer-events-none absolute -inset-[2px] rounded-2xl bg-[conic-gradient(from_0deg,transparent,hsl(var(--primary)/0.6),transparent_40%)] opacity-70 blur-[6px] animate-[spin_6s_linear_infinite]" />
        <div className="relative flex items-end gap-2 rounded-2xl border border-white/10 bg-[color:var(--card)] px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
          <button
            type="button"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition shrink-0"
            aria-label="Attach"
          >
            <Plus className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={t("app.overview.placeholder")}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none max-h-40 py-1.5"
          />
          <button
            type="button"
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition shrink-0"
            aria-label="Voice"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-50 shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.45)]"
            aria-label="Send"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 fill-current" />}
          </button>
        </div>
      </div>
    </div>
  );
}
