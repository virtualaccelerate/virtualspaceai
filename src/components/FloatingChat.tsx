import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";

export function FloatingChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Hide launcher on the dedicated chat page itself
  const hidden = pathname === "/app" || pathname === "/app/" || pathname.startsWith("/app/c/");

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  if (hidden) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed z-40 right-4 bottom-40 sm:right-6 sm:bottom-24 w-[min(380px,calc(100vw-2rem))] h-[min(600px,calc(100vh-12rem))] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
              <div className="text-sm font-semibold text-foreground">Virtual Space</div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3">
              <ChatPanel variant="compact" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed z-40 right-4 bottom-20 sm:right-6 sm:bottom-6 h-14 w-14 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_10px_30px_hsl(var(--primary)/0.45)] hover:scale-105 transition"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>
    </>
  );
}
