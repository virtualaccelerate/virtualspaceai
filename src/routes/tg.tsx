import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/tg")({
  ssr: false,
  component: TelegramMiniApp,
  head: () => ({
    meta: [
      { title: "Virtual Space — Mini App" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}

function loadTelegramSdk(): Promise<any> {
  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) return resolve(window.Telegram.WebApp);
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.async = true;
    s.onload = () => resolve(window.Telegram?.WebApp ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

function TelegramMiniApp() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "not_linked" | "error">("loading");

  useEffect(() => {
    (async () => {
      const webApp = await loadTelegramSdk();
      try {
        webApp?.ready?.();
        webApp?.expand?.();
      } catch { /* ignore */ }

      window.localStorage.setItem("tg.miniapp", "1");
      const tgLang = webApp?.initDataUnsafe?.user?.language_code;
      if (tgLang && ["ru", "en", "kk", "ky", "uz", "tg"].includes(tgLang)) {
        void i18n.changeLanguage(tgLang);
      }

      // Already signed in inside the mini app? go straight in.
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        navigate({ to: "/app", replace: true });
        return;
      }

      const initData: string = webApp?.initData ?? "";
      if (!initData) {
        setState("error");
        return;
      }

      try {
        const res = await fetch("/api/public/telegram/miniapp-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const json = await res.json();
        if (!res.ok) {
          setState(json?.error === "not_linked" ? "not_linked" : "error");
          return;
        }
        const { error } = await supabase.auth.verifyOtp({
          type: "email",
          token_hash: json.tokenHash,
        });
        if (error) {
          setState("error");
          return;
        }
        navigate({ to: "/app", replace: true });
      } catch {
        setState("error");
      }
    })();
  }, [i18n, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
          <Send className="h-6 w-6" />
        </div>

        {state === "loading" && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("tg.signingIn", "Signing you in…")}</p>
          </div>
        )}

        {state === "not_linked" && (
          <div className="mt-6 space-y-3">
            <h1 className="font-display text-xl">{t("tg.notLinkedTitle", "Account is not linked")}</h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "tg.notLinkedBody",
                "Open the Telegram page in the web app, copy your code and send /start CODE to the bot. Then reopen the mini app.",
              )}
            </p>
            <a
              href="/auth"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold"
            >
              {t("tg.openWeb", "Open the web version")}
            </a>
          </div>
        )}

        {state === "error" && (
          <div className="mt-6 space-y-3">
            <h1 className="font-display text-xl">{t("tg.errorTitle", "Could not sign in")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("tg.errorBody", "Open this page from the Telegram bot menu button.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
