import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/analytics")({
  component: () => (
    <ComingSoon
      icon={BarChart3}
      title="Analytics"
      description="Аналитика по задачам, командам, клиентам и AI-агентам в реальном времени."
    />
  ),
  head: () => ({ meta: [{ title: "Analytics — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
