import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/docs")({
  component: () => (
    <ComingSoon
      icon={BookOpen}
      title="Knowledge Base"
      description="Единая база знаний команды: документы, вики, гайды и AI-поиск по контенту."
    />
  ),
  head: () => ({ meta: [{ title: "Knowledge Base — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
