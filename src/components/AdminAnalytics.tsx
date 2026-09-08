import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminGetAnalytics } from "@/lib/admin.functions";
import type { AdminAnalytics as Analytics } from "@/lib/admin-analytics.server";

function fmt(ts: string | null) {
  return ts ? new Date(ts).toLocaleString("ru-RU") : "—";
}

function Bars({ data, label }: { data: { period: string; events: number; users: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.events));
  return (
    <section className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-4">{label}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет данных</p>
      ) : (
        <div className="flex items-end gap-1.5 h-40">
          {data.map((d) => (
            <div key={d.period} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full rounded-t bg-primary/70 group-hover:bg-primary transition-all min-h-[2px]"
                style={{ height: `${(d.events / max) * 100}%` }}
                title={`${d.period}: ${d.events} действий, ${d.users} польз.`}
              />
              <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                {d.period.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetAnalytics()
      .then((r) => setData(r as Analytics | null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }
  if (!data) return <p className="p-8 text-center text-sm text-muted-foreground">Нет доступа к данным</p>;

  const cards = [
    { label: "Рабочих пространств", value: data.totals.workspaces },
    { label: "Пользователей", value: data.totals.users },
    { label: "Активны за 7 дней", value: data.totals.activeUsers7d },
    { label: "Активны за 30 дней", value: data.totals.activeUsers30d },
    { label: "Задач (90 дн.)", value: data.totals.tasks },
    { label: "Документов (90 дн.)", value: data.totals.documents },
    { label: "Сообщений (90 дн.)", value: data.totals.messages },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars data={data.daily} label="Активность по дням (30 дней)" />
        <Bars data={data.weekly} label="Активность по неделям (12 недель)" />
      </div>

      <section className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-4">Топ функций</h3>
        {data.topFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет данных</p>
        ) : (
          <div className="space-y-2">
            {data.topFeatures.map((f) => {
              const max = data.topFeatures[0]?.count || 1;
              return (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm truncate">{f.feature}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(f.count / max) * 100}%` }} />
                  </div>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    {f.count} · {f.users} польз.
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Рабочие пространства</h3>
          <span className="text-xs text-muted-foreground">{data.workspaces.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/50">
                {["Название", "Владелец", "Тип", "Участники", "Задачи", "Документы", "Сообщения", "Создано", "Последняя активность"].map(
                  (h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.workspaces.map((w) => (
                <tr key={w.id} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-3">{w.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {w.owner_name}
                    <span className="block text-xs">{w.owner_email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.business_type}</td>
                  <td className="px-4 py-3">{w.members}</td>
                  <td className="px-4 py-3">{w.tasks}</td>
                  <td className="px-4 py-3">{w.documents}</td>
                  <td className="px-4 py-3">{w.messages}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(w.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(w.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">Журнал действий</h3>
        </div>
        {data.recent.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            События появятся, как только пользователи начнут работать в платформе
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/50">
                  {["Когда", "Пользователь", "Пространство", "Событие", "Тип", "Страница"].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="px-4 py-3">{r.user_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.workspace_name}</td>
                    <td className="px-4 py-3">{r.feature}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.kind === "page_view" ? "просмотр" : "действие"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.path ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
