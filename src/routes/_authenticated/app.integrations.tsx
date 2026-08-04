import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Plug, FileText, MessageSquare, Database,
  Sheet, Cloud, StickyNote, Briefcase, Check, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { GoogleDriveCard } from "@/components/GoogleDriveCard";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  component: IntegrationsPage,
});

type Source = {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  status: "available" | "soon";
};

function IntegrationsPage() {
  const { t } = useTranslation();

  const sources: Source[] = [
    
    { id: "google_sheets", name: "Google Sheets", desc: t("app.integrations.desc.gsheets", "Live tables and finance data"), icon: Sheet, accent: "text-green-400", status: "available" },
    { id: "notion", name: "Notion", desc: t("app.integrations.desc.notion", "Wiki, pages and databases"), icon: FileText, accent: "text-white", status: "available" },
    { id: "slack", name: "Slack", desc: t("app.integrations.desc.slack", "Team messages and channels"), icon: MessageSquare, accent: "text-purple-400", status: "available" },
    { id: "onedrive", name: "OneDrive", desc: t("app.integrations.desc.onedrive", "Files stored in Microsoft 365"), icon: Cloud, accent: "text-blue-400", status: "available" },
    { id: "onenote", name: "OneNote", desc: t("app.integrations.desc.onenote", "Notebooks and quick notes"), icon: StickyNote, accent: "text-fuchsia-400", status: "soon" },
    { id: "1c", name: "1C", desc: t("app.integrations.desc.1c", "Accounting and inventory"), icon: Database, accent: "text-orange-400", status: "soon" },
    { id: "bitrix", name: "Bitrix24", desc: t("app.integrations.desc.bitrix", "CRM, deals and tasks"), icon: Briefcase, accent: "text-sky-400", status: "soon" },
  ];

  const available = sources.filter((s) => s.status === "available");
  const soon = sources.filter((s) => s.status === "soon");

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            {t("app.integrations.title", "Integrations")}
          </h1>
          <p className="mt-1.5 text-sm text-white/60 max-w-2xl">
            {t(
              "app.integrations.subtitle",
              "Connect your data sources so the assistant answers across your whole company — Drive, Sheets, Notion, Slack and more.",
            )}
          </p>
        </div>
      </header>

      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">
          {t("app.integrations.available", "Available")}
        </h2>
        <div className="flex flex-col gap-2.5">
          <GoogleDriveCard />
          {available.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">
          {t("app.integrations.soon", "Coming soon")}
        </h2>
        <div className="flex flex-col gap-2.5">
          {soon.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceRow({ source }: { source: Source }) {
  const { t } = useTranslation();
  const disabled = source.status === "soon";
  return (
    <div className="glass-strong rounded-2xl border border-white/10 px-4 py-3.5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${source.accent}`}>
        <source.icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-[15px] truncate">{source.name}</span>
          {disabled && (
            <span className="text-[9px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-1.5 py-0.5 inline-flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {t("app.integrations.soonBadge", "Soon")}
            </span>
          )}
        </div>
        <p className="hidden sm:block text-xs text-white/50 mt-0.5 leading-snug truncate">{source.desc}</p>
      </div>

      <button
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          alert(t("app.integrations.wip", "Connection flow coming next — the UI is ready."));
        }}
        className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium transition border ${
          disabled
            ? "bg-white/5 text-white/35 border-white/5 cursor-not-allowed"
            : "bg-white/10 text-white border-white/15 hover:bg-white/15"
        }`}
      >
        {disabled ? t("app.integrations.notify", "Notify me") : t("app.integrations.connect", "Connect")}
      </button>
    </div>
  );
}

