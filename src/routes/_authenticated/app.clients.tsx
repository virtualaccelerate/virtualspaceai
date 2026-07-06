import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: () => (
    <ComingSoon
      icon={Users}
      title="Client Workspace"
      description="Отдельные пространства для клиентов: задачи, документы, обсуждения и отчёты."
    />
  ),
  head: () => ({ meta: [{ title: "Clients — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
