import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Users, HelpCircle, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/app/learn")({
  component: LearnPage,
  head: () => ({ meta: [{ title: "Learning — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});

function LearnPage() {
  const { t } = useTranslation();

  const cards = [
    { key: "courses", icon: PlayCircle },
    { key: "mentors", icon: Users },
    { key: "knowledge", icon: BookOpen },
    { key: "faq", icon: HelpCircle },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-white">
            {t("app.learn.title", "Learning Center")}
          </h1>
        </div>
        <p className="mt-2 text-sm text-white/60 max-w-2xl">
          {t("app.learn.subtitle", "Courses, mentors and knowledge base — coming soon.")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className="glass-strong rounded-2xl p-5 text-center opacity-80 hover:opacity-100 transition"
          >
            <div className="mx-auto h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              {t(`app.learn.cards.${key}.title`, key)}
            </h3>
            <p className="mt-1.5 text-xs text-white/55 leading-relaxed">
              {t(`app.learn.cards.${key}.body`, "")}
            </p>
            <span className="inline-block mt-4 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 rounded-full px-2.5 py-0.5">
              {t("app.nav.comingSoon", "Soon")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
