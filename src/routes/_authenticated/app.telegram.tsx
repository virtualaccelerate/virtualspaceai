import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send, Copy, Check, Loader2, Unplug, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  getTelegramStatus,
  setupTelegramWebhook,
  unlinkTelegram,
} from "@/lib/telegram.functions";

export const Route = createFileRoute("/_authenticated/app/telegram")({
  component: TelegramPage,
  head: () => ({
    meta: [{ title: "Telegram — Virtual Space" }, { name: "robots", content: "noindex" }],
  }),
});

function TelegramPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const status = useServerFn(getTelegramStatus);
  const setup = useServerFn(setupTelegramWebhook);
  const unlink = useServerFn(unlinkTelegram);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["telegram-status"],
    queryFn: () => status(),
  });

  const setupMut = useMutation({
    mutationFn: () => setup(),
    onSuccess: (res: any) => {
      if (res?.ok) toast.success(t("app.telegram.activated", "Bot activated"));
      else toast.error(res?.error ?? t("app.telegram.activateError", "Could not activate the bot"));
      qc.invalidateQueries({ queryKey: ["telegram-status"] });
    },
  });

  const unlinkMut = useMutation({
    mutationFn: () => unlink(),
    onSuccess: () => {
      toast.success(t("app.telegram.unlinked", "Telegram disconnected"));
      qc.invalidateQueries({ queryKey: ["telegram-status"] });
    },
  });

  const command = data?.code ? `/start ${data.code}` : "";
  const deepLink =
    data?.botUsername && data?.code ? `https://t.me/${data.botUsername}?start=${data.code}` : null;

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const abilities = [
    t("app.telegram.can.tasks", "See open tasks and change their status with one tap"),
    t("app.telegram.can.new", "Create tasks: /new Call the client"),
    t("app.telegram.can.done", "Complete tasks: /done Call the client"),
    t("app.telegram.can.report", "Get reports: /report day | week | month"),
    t("app.telegram.can.ai", "Ask the AI assistant anything — it sees your knowledge base, finances and tasks"),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            {t("app.telegram.title", "Telegram bot")}
          </h1>
          <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
            {t(
              "app.telegram.subtitle",
              "Manage Virtual Space right from Telegram: tasks, statuses, reports and the AI assistant.",
            )}
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("app.telegram.loading", "Loading…")}
          </div>
        ) : data?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <Check className="h-4 w-4" />
              {t("app.telegram.connected", "Connected")}
              {data.telegramUsername ? (
                <span className="text-white/50 font-normal">@{data.telegramUsername}</span>
              ) : null}
            </div>
            <button
              onClick={() => unlinkMut.mutate()}
              disabled={unlinkMut.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              <Unplug className="h-4 w-4" />
              {t("app.telegram.disconnect", "Disconnect")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              {t("app.telegram.howto", "Open the bot in Telegram and send this command:")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-primary">
                {command || "…"}
              </code>
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t("app.telegram.copy", "Copy")}
              </button>
              {deepLink ? (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t("app.telegram.open", "Open the bot")}
                </a>
              ) : null}
            </div>
            <p className="text-xs text-white/40">
              {t(
                "app.telegram.hint",
                "The code is personal — everything the bot does happens inside your account.",
              )}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">
          {t("app.telegram.abilities", "What the bot can do")}
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

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">
          {t("app.telegram.admin", "Bot setup")}
        </h2>
        <p className="text-sm text-white/60 mb-3">
          {t(
            "app.telegram.adminHint",
            "Run this once (or after a new deploy) to register the bot webhook and its command menu.",
          )}
        </p>
        <button
          onClick={() => setupMut.mutate()}
          disabled={setupMut.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          {setupMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("app.telegram.activate", "Activate bot")}
        </button>
      </section>
    </div>
  );
}
