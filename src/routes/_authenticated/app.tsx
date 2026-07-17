import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Mic, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { askZukha } from "@/lib/ai-chat.functions";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";


export const Route = createFileRoute("/_authenticated/app")({
  component: HomeChat,
  head: () => ({
    meta: [
      { title: "Home — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type ChatMsg = { role: "user" | "assistant"; content: string };

const stripMarkdown = (s: string) =>
  s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ");

function HomeChat() {
  const { t } = useTranslation();
  const ask = useServerFn(askZukha);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

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
      const res = await ask({ data: { messages: next } });
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <VirtualSpaceLogo size={96} className="text-primary drop-shadow-[0_10px_30px_oklch(0.80_0.22_138_/_0.5)]" />
              </motion.div>
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
                    {m.content}
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
      <div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
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
          className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
