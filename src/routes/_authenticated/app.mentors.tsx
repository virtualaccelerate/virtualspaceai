import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { MentorsGrid, useMentors } from "@/components/MentorsCatalog";

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
  const { data, isLoading } = useMentors();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("app.mentors.title", "Mentors")}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          {t("mentors.subtitle", "Book an hour with an expert and get practical guidance for your business.")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <MentorsGrid items={data ?? []} />
      )}
    </div>
  );
}
