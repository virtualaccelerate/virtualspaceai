import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/agents")({
  component: () => (
    <ComingSoon
      icon={Bot}
      title="AI Agents"
      description="Создавайте и оркестрируйте AI-агентов, которые выполняют задачи внутри вашего Virtual Office."
    />
  ),
  head: () => ({ meta: [{ title: "AI Agents — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
