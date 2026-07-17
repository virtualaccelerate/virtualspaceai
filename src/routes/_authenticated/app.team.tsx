import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/team")({
  component: () => (
    <ComingSoon
      title="Team"
      description="See everyone in your teamspace, manage roles, and invite new members."
      icon={Users}
    />
  ),
  head: () => ({ meta: [{ title: "Team — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
