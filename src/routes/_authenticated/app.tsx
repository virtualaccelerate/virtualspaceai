import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trackActivity } from "@/lib/activity.functions";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";

const FEATURE_BY_SEGMENT: Record<string, string> = {
  "": "Чат",
  c: "Чат",
  tasks: "Задачи",
  docs: "База знаний",
  financials: "Финансы",
  team: "Команда",
  agents: "AI-агенты",
  integrations: "Интеграции",
  courses: "Обучение",
  mentors: "Менторы",
  learn: "Обучение",
  overview: "Обзор",
  clients: "Клиенты",
  settings: "Настройки",
  profile: "Профиль",
  telegram: "Telegram",
  time: "Время",
  analytics: "Аналитика",
  solutions: "Решения",
};

function ActivityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    const segment = pathname.replace(/^\/app\/?/, "").split("/")[0] ?? "";
    const feature = FEATURE_BY_SEGMENT[segment] ?? segment ?? "Приложение";
    void (async () => {
      try {
        const teamspaceId = await getActiveTeamspaceId();
        await trackActivity({
          data: { kind: "page_view", feature, path: pathname, teamspace_id: teamspaceId },
        });
      } catch {
        /* tracking is best-effort */
      }
    })();
  }, [pathname]);

  return null;
}

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <>
      <ActivityTracker />
      <Outlet />
    </>
  ),
});
