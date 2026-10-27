import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check, Loader2, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getWhatsAppStatus, unlinkWhatsApp } from "@/lib/whatsapp.functions";

/** WhatsApp mark as a single-path inline glyph: it inherits the surrounding text color. */
function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42" />
    </svg>
  );
}

/** Flip to true once the bot is tested: the label disappears and the button becomes clickable. */
const WHATSAPP_BOT_READY = false;

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  component: WhatsAppPage,
  head: () => ({
    meta: [{ title: "WhatsApp — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

function InProgressPill() {
  const { t } = useTranslation();
  return (
    <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-full px-1.5 py-0.5">
      {t("integrationsUi.whatsapp.inProgress", "On process")}
    </span>
  );
}

function WhatsAppPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const status = useServerFn(getWhatsAppStatus);
  const unlink = useServerFn(unlinkWhatsApp);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["whatsapp-status"], queryFn: () => status() });

  const unlinkMut = useMutation({
    mutationFn: () => unlink(),
    onSuccess: () => {
      toast.success(t("integrationsUi.whatsapp.unlinked", "WhatsApp disconnected"));
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    },
  });

  const copy = async () => {
    if (!data?.code) return;
    await navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const abilities = [
    t("integrationsUi.whatsapp.can.new", "Create tasks from a plain message"),
    t("integrationsUi.whatsapp.can.status", "Update task status"),
    t("integrationsUi.whatsapp.can.ai", "Ask the AI assistant"),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <WhatsAppGlyph className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl text-white">
              {t("integrationsUi.whatsapp.title", "WhatsApp bot")}
            </h1>
            {!WHATSAPP_BOT_READY && <InProgressPill />}
          </div>
          <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
            {t("integrationsUi.whatsapp.subtitle", "Create tasks, change statuses and ask the AI assistant right from WhatsApp.")}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("integrationsUi.whatsapp.loading", "Loading…")}
          </div>
        ) : data?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <Check className="h-4 w-4" />
              {t("integrationsUi.whatsapp.connected", "Connected")}
              <span className="text-white/50 font-normal">
                +{data.phoneNumber}{data.waName ? ` · ${data.waName}` : ""}
              </span>
            </div>
            <button
              onClick={() => unlinkMut.mutate()}
              disabled={unlinkMut.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              <Unplug className="h-4 w-4" />
              {t("integrationsUi.whatsapp.disconnect", "Disconnect")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {WHATSAPP_BOT_READY && data?.waLink ? (
              <p className="text-sm text-white/70">
                {t("integrationsUi.whatsapp.howto", "Send this code to the Virtual Space number in WhatsApp:")}
              </p>
            ) : (
              <p className="text-sm text-white/50">
                {t("integrationsUi.whatsapp.notSetUp", "The WhatsApp bot is not set up yet.")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl border border-accent-foreground/15 bg-accent px-3.5 py-2 font-mono text-base font-semibold tracking-widest text-accent-foreground">
                {data?.code ?? "…"}
              </code>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t("integrationsUi.whatsapp.copy", "Copy")}
              </button>
              {WHATSAPP_BOT_READY && data?.waLink ? (
                <a
                  href={data.waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  <WhatsAppGlyph className="h-3.5 w-3.5" />
                  {t("integrationsUi.whatsapp.open", "Open WhatsApp")}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-white/40 cursor-not-allowed"
                >
                  <WhatsAppGlyph className="h-3.5 w-3.5" />
                  {t("integrationsUi.whatsapp.open", "Open WhatsApp")}
                  {!WHATSAPP_BOT_READY && <InProgressPill />}
                </button>
              )}
            </div>
            <p className="text-xs text-white/40">
              {t("integrationsUi.whatsapp.hint", "The code is personal — everything the bot does happens inside your account.")}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">
          {t("integrationsUi.whatsapp.abilities", "What the bot can do")}
        </h2>
        <ul className="space-y-2">
          {abilities.map((a) => (
            <li key={a} className="flex items-start gap-2 text-sm text-white/75">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
