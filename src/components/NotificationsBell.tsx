import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listNotifications, markNotificationsAsRead } from "@/lib/notifications.functions";

type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  actor_name: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const { t } = useTranslation();
  const load = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsAsRead);
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const rows = (await load()) as Notice[];
      setItems(rows ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markRead({ data: {} }).catch(() => {});
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        className="relative h-9 w-9 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition flex items-center justify-center"
        aria-label={t("app.notifications.title", "Уведомления")}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-[10px] font-semibold text-[color:var(--primary-foreground)] flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl z-50">
          <div className="px-4 py-3 border-b border-[color:var(--border)] text-sm font-medium">
            {t("app.notifications.title", "Уведомления")}
          </div>
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-[color:var(--muted-foreground)]">
              {t("app.notifications.empty", "Пока нет уведомлений")}
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--border)]">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && (
                    <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)] whitespace-pre-line">{n.body}</div>
                  )}
                  <div className="mt-1 text-[10px] text-[color:var(--muted-foreground)]">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
