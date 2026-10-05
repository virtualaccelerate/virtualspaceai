import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Copy, Check, Loader2, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getWhatsAppStatus, unlinkWhatsApp } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/app/whatsapp")({
  component: WhatsAppPage,
  head: () => ({
    meta: [{ title: "WhatsApp — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

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
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            {t("integrationsUi.whatsapp.title", "WhatsApp bot")}
          </h1>
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
            {data?.waLink ? (
              <p className="text-sm text-white/70">
                {t("integrationsUi.whatsapp.howto", "Send this code to the Virtual Space number in WhatsApp:")}
              </p>
            ) : (
              <p className="text-sm text-white/50">
                {t("integrationsUi.whatsapp.notSetUp", "The WhatsApp bot is not set up yet.")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-primary">
                {data?.code ?? "…"}
              </code>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t("integrationsUi.whatsapp.copy", "Copy")}
              </button>
              {data?.waLink ? (
                <a
                  href={data.waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("integrationsUi.whatsapp.open", "Open WhatsApp")}
                </a>
              ) : null}
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
