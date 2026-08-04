import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { CoursesGrid, useCourses } from "@/components/CoursesCatalog";

export const Route = createFileRoute("/courses")({
  component: CoursesPage,
  head: () => ({
    meta: [
      { title: "Курсы — Virtual Space" },
      {
        name: "description",
        content:
          "Практические курсы Virtual Space по ИИ, операционке и росту бизнеса: покупка онлайн и мгновенный доступ к видео.",
      },
      { property: "og:title", content: "Курсы — Virtual Space" },
      {
        property: "og:description",
        content: "Практические курсы по ИИ и управлению бизнесом от команды Virtual Space.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ai-virtualspace.com/courses" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ai-virtualspace.com/courses" }],
  }),
});

function CoursesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCourses();

  return (
    <div className="min-h-screen bg-[#05070d]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> {t("courses.back", "Home")}
        </Link>

        <h1 className="mt-6 font-display text-3xl sm:text-5xl text-white">{t("courses.title", "Courses")}</h1>
        <p className="mt-4 max-w-2xl text-base text-white/60 leading-relaxed">
          {t("courses.subtitle", "Practical programs on AI, operations and growth — buy and start right away.")}
        </p>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-3xl h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <CoursesGrid items={data ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
