import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";

function TimeComingSoon() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      icon={Timer}
      title={t("shellUi.comingSoon.time.title", "Time Tracking")}
      description={t("shellUi.comingSoon.time.description", "Track time by projects and clients with automatic AI-powered categorization.")}
    />
  );
}

export const Route = createFileRoute("/_authenticated/app/time")({
  component: TimeComingSoon,
  head: () => ({ meta: [{ title: "Time Tracking — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
