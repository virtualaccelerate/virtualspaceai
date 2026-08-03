import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/solutions")({
  component: SolutionsPage,
  head: () => ({
    meta: [
      { title: "Solutions — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SolutionsPage() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t("app.solutions.title", "Solutions")}
      description={t("app.solutions.subtitle", "Startup marketplace and ready-made business solutions.")}
      icon={Briefcase}
    />
  );
}
