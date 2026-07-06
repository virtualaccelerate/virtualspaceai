import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: () => (
    <ComingSoon
      icon={CheckSquare}
      title="Tasks"
      description="Управляйте задачами команды в стиле ClickUp: списки, доски, приоритеты и AI-автоматизации."
    />
  ),
  head: () => ({ meta: [{ title: "Tasks — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
