import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ChatPanel } from "@/components/ChatPanel";

export function FloatingChat() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
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
            initial={{ x: reducedMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: reducedMotion ? 0 : "100%" }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            role="dialog"
            aria-label={t("app.chat.newChat", "New chat")}
            className="fixed z-50 inset-y-0 right-0 w-full sm:w-[380px] h-dvh border-l border-border bg-background shadow-2xl overflow-hidden flex flex-col p-3"
          >
            <ChatPanel variant="compact" onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!open && <Button size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("app.chat.newChat", "New chat")}
        title={t("app.chat.newChat", "New chat")}
        className="fixed z-40 right-4 bottom-20 sm:right-6 lg:bottom-6 h-10 w-10 rounded-lg bg-primary text-primary-foreground shadow-lg"
      >
        <Sparkles className="h-5 w-5" />
      </Button>}

    </>
  );
}
