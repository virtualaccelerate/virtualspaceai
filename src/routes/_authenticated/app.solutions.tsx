import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Briefcase } from "lucide-react";
import { StartupsGrid, useStartups } from "@/components/StartupsCatalog";

export const Route = createFileRoute("/_authenticated/app/solutions")({
  component: SolutionsPage,
  head: () => ({
    meta: [
      { title: "Solutions — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function SolutionsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStartups();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">
            {t("app.solutions.title", "Solutions")}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{t("startups.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl h-52 animate-pulse" />
          ))}
        </div>
      ) : (
        <StartupsGrid items={data ?? []} />
      )}
    </div>
  );
}
