import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";

function AnalyticsComingSoon() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      icon={BarChart3}
      title={t("shellUi.comingSoon.analytics.title", "Analytics")}
      description={t("shellUi.comingSoon.analytics.description", "Real-time analytics across tasks, teams, clients and AI agents.")}
    />
  );
}

export const Route = createFileRoute("/_authenticated/app/analytics")({
  component: AnalyticsComingSoon,
  head: () => ({ meta: [{ title: "Analytics — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
