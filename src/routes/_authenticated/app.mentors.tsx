import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/mentors")({
  component: MentorsPage,
  head: () => ({
    meta: [
      { title: "Mentors — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function MentorsPage() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t("app.mentors.title", "Mentors")}
      description={t("app.mentors.subtitle", "Book expert sessions and get guidance for your team.")}
      icon={Users}
    />
  );
}
