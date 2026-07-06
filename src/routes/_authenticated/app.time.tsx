import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/time")({
  component: () => (
    <ComingSoon
      icon={Timer}
      title="Time Tracking"
      description="Учёт времени по проектам и клиентам с автоматической категоризацией через AI."
    />
  ),
  head: () => ({ meta: [{ title: "Time Tracking — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
