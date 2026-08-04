import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Lock, LogOut, Pencil, Plus, RefreshCw, Trash2, User, X } from "lucide-react";
import {
  adminGetDemoRequests,
  adminLogin,
  adminLogout,
  adminSessionStatus,
  adminListStartups,
  adminSaveStartup,
  adminDeleteStartup,
  adminUploadStartupLogo,
  type DemoRequestRow,
} from "@/lib/admin.functions";
import type { StartupRow } from "@/lib/startups.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Админ-панель — Virtual Space" },
      { name: "description", content: "Внутренняя панель управления Virtual Space: заявки на демо и контент." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Админ-панель — Virtual Space" },
      { property: "og:description", content: "Внутренняя панель управления Virtual Space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const TABS = [
  { id: "leads", label: "Заявки на демо" },
  { id: "speakers", label: "Спикеры" },
  { id: "courses", label: "Курсы" },
  { id: "startups", label: "Стартапы" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("leads");
  const [rows, setRows] = useState<DemoRequestRow[] | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    adminSessionStatus()
      .then((r) => setAuthed(r.authed))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  const loadRows = async () => {
    setLoadingRows(true);
    try {
      setRows(await adminGetDemoRequests());
    } catch {
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (authed) void loadRows();
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminLogin({ data: { username, password } });
      if (res.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        setError("Неверный логин или пароль");
      }
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setAuthed(false);
    setRows(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="glass-strong w-full max-w-sm rounded-3xl p-8 space-y-3">
          <h1 className="font-display text-2xl text-center">Админ-панель</h1>
          <p className="text-sm text-muted-foreground text-center pb-2">Вход только для администраторов</p>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Логин"
              autoComplete="username"
              required
              className="glass w-full rounded-full pl-11 pr-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              autoComplete="current-password"
              required
              className="glass w-full rounded-full pl-11 pr-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {error && <p className="text-xs text-destructive px-2">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl">Админ-панель</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRows}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted/40 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? "animate-spin" : ""}`} /> Обновить
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted/40 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Выйти
          </button>
        </div>
      </header>

      <nav className="px-6 pt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:bg-muted/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {tab === "leads" ? (
          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Заявки на демо</h2>
              <span className="text-xs text-muted-foreground">{rows?.length ?? 0}</span>
            </div>
            {loadingRows && !rows ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : rows && rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <th className="text-left font-medium px-5 py-3">Имя</th>
                      <th className="text-left font-medium px-5 py-3">Контакт</th>
                      <th className="text-left font-medium px-5 py-3">Компания</th>
                      <th className="text-left font-medium px-5 py-3">Язык</th>
                      <th className="text-left font-medium px-5 py-3">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-border/30 last:border-0">
                        <td className="px-5 py-3">{r.name}</td>
                        <td className="px-5 py-3">{r.contact}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.company ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground uppercase">{r.language ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">Заявок пока нет</p>
            )}
          </section>
        ) : tab === "startups" ? (
          <StartupsAdmin />
        ) : (
          <section className="glass rounded-2xl p-10 text-center">
            <h2 className="font-display text-lg mb-2">{TABS.find((t) => t.id === tab)?.label}</h2>
            <p className="text-sm text-muted-foreground">
              Раздел в разработке — добавим управление контентом на следующем шаге.
            </p>
          </section>
        )}

      </main>
    </div>
  );
}

type StartupForm = {
  id: string | null;
  name: string;
  description: string;
  description_ru: string;
  image_url: string;
  website_url: string;
  cta_label: string;
  tags: string;
  position: number;
  published: boolean;
};

const emptyStartup: StartupForm = {
  id: null,
  name: "",
  description: "",
  description_ru: "",
  image_url: "",
  website_url: "",
  cta_label: "",
  tags: "",
  position: 0,
  published: true,
};

function StartupsAdmin() {
  const [items, setItems] = useState<StartupRow[] | null>(null);
  const [form, setForm] = useState<StartupForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await adminListStartups());
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const edit = (r: StartupRow) =>
    setForm({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      description_ru: r.description_ru ?? "",
      image_url: r.image_url ?? "",
      website_url: r.website_url ?? "",
      cta_label: r.cta_label ?? "",
      tags: (r.tags ?? []).join(", "),
      position: r.position,
      published: r.published,
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await adminSaveStartup({
        data: {
          id: form.id,
          values: {
            name: form.name,
            description: form.description,
            description_ru: form.description_ru,
            image_url: form.image_url,
            website_url: form.website_url,
            cta_label: form.cta_label,
            tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
            position: Number(form.position) || 0,
            published: form.published,
          },
        },
      });
      setForm(null);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить стартап?")) return;
    await adminDeleteStartup({ data: { id } });
    await load();
  };

  const field = "glass w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Стартапы каталога ({items?.length ?? 0})</h2>
        <button
          onClick={() => setForm({ ...emptyStartup, position: (items?.length ?? 0) + 1 })}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
        >
          <Plus className="h-3.5 w-3.5" /> Добавить
        </button>
      </div>

      {form && (
        <form onSubmit={save} className="glass rounded-2xl p-5 grid gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Название" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} placeholder="Ссылка на сайт (https://...)" value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          <textarea className={`${field} sm:col-span-2`} rows={2} placeholder="Описание (EN)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className={`${field} sm:col-span-2`} rows={2} placeholder="Описание (RU)" value={form.description_ru}
            onChange={(e) => setForm({ ...form, description_ru: e.target.value })} />
          <input className={field} placeholder="URL логотипа / картинки" value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <input className={field} placeholder="Текст кнопки (по умолчанию «Перейти на сайт»)" value={form.cta_label}
            onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
          <input className={field} placeholder="Теги через запятую" value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <input className={field} type="number" placeholder="Порядок" value={form.position}
            onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Опубликован
          </label>
          {err && <p className="text-xs text-destructive sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs font-semibold disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Сохранить
            </button>
            <button type="button" onClick={() => setForm(null)}
              className="rounded-full border border-border px-5 py-2.5 text-xs hover:bg-muted/40 transition">
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        {items && items.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/50">
                <th className="text-left font-medium px-5 py-3">#</th>
                <th className="text-left font-medium px-5 py-3">Название</th>
                <th className="text-left font-medium px-5 py-3">Сайт</th>
                <th className="text-left font-medium px-5 py-3">Статус</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border/30 last:border-0">
                  <td className="px-5 py-3 text-muted-foreground">{r.position}</td>
                  <td className="px-5 py-3">{r.name}</td>
                  <td className="px-5 py-3 text-muted-foreground truncate max-w-[220px]">{r.website_url ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.published ? "Опубликован" : "Скрыт"}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => edit(r)} className="p-2 hover:text-primary transition" title="Редактировать">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(r.id)} className="p-2 hover:text-destructive transition" title="Удалить">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">Пока пусто</p>
        )}
      </div>
    </section>
  );
}
