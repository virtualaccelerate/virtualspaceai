import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/telegram")({
  component: () => (
    <ComingSoon
      title="Telegram Bot"
      description="Connect your Telegram bot to receive tasks, alerts, and AI replies directly in chat."
      icon={Send}
    />
  ),
  head: () => ({ meta: [{ title: "Telegram — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
