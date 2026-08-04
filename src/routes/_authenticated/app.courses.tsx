import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { CoursesGrid, useCourses } from "@/components/CoursesCatalog";

export const Route = createFileRoute("/_authenticated/app/courses")({
  component: AppCoursesPage,
  head: () => ({
    meta: [
      { title: "Курсы — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AppCoursesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCourses();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground">{t("courses.title", "Courses")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("courses.subtitle", "Practical programs on AI, operations and growth.")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-3xl h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <CoursesGrid items={data ?? []} />
      )}
    </div>
  );
}
