import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "@/components/ComingSoon";

function ClientsComingSoon() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      icon={Users}
      title={t("shellUi.comingSoon.clients.title", "Client Workspace")}
      description={t("shellUi.comingSoon.clients.description", "Dedicated workspaces for clients: tasks, documents, discussions and reports.")}
    />
  );
}

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: ClientsComingSoon,
  head: () => ({ meta: [{ title: "Clients — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
