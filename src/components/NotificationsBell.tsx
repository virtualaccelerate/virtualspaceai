import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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

const LAST_TOASTED_KEY = "notif.lastToasted";

export function NotificationsBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const load = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsAsRead);
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const goToNotifications = () => {
    setOpen(false);
    navigate({ to: "/app/overview", hash: "notifications" });
  };

  const maybeToast = (rows: Notice[]) => {
    try {
      const lastToasted = sessionStorage.getItem(LAST_TOASTED_KEY);
      const fresh = rows.filter(
        (n) => !n.read_at && (!lastToasted || new Date(n.created_at).getTime() > new Date(lastToasted).getTime()),
      );
      if (fresh.length === 0) return;
      const newest = fresh[0];
      sessionStorage.setItem(LAST_TOASTED_KEY, newest.created_at);
      toast(newest.title + (fresh.length > 1 ? ` +${fresh.length - 1}` : ""), {
        description: newest.body ? newest.body.split("\n")[0] : undefined,
        action: {
          label: t("app.notifications.open", "Открыть"),
          onClick: () => navigate({ to: "/app/overview", hash: "notifications" }),
        },
      });
    } catch { /* sessionStorage unavailable */ }
  };

  const refresh = async () => {
    try {
      const rows = (await load()) as Notice[];
      setItems(rows ?? []);
      maybeToast(rows ?? []);
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
        <motion.span
          className="flex items-center justify-center"
          animate={
            unread > 0 && !reduceMotion
              ? { rotate: [0, -12, 10, -8, 6, 0] }
              : { rotate: 0 }
          }
          transition={
            unread > 0 && !reduceMotion
              ? { duration: 0.9, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }
              : { duration: 0.2 }
          }
        >
          <Bell className="h-4 w-4" />
        </motion.span>
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center">
            <span className="absolute inline-flex h-4 min-w-[1rem] rounded-full bg-primary animate-ping opacity-60" />
            <span className="relative min-w-[1rem] h-4 px-1 rounded-full bg-primary text-[10px] font-semibold text-[color:var(--primary-foreground)] flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
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
                <li key={n.id}>
                  <button
                    onClick={goToNotifications}
                    className="w-full text-left px-4 py-3 cursor-pointer hover:bg-white/5 transition"
                  >
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && (
                      <div className="mt-0.5 text-xs text-[color:var(--muted-foreground)] whitespace-pre-line">{n.body}</div>
                    )}
                    <div className="mt-1 text-[10px] text-[color:var(--muted-foreground)]">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={goToNotifications}
            className="w-full px-4 py-2.5 border-t border-[color:var(--border)] text-xs font-medium text-[color:var(--muted-foreground)] hover:text-foreground hover:bg-white/5 transition cursor-pointer"
          >
            {t("app.notifications.viewAll", "Все уведомления")}
          </button>
        </div>
      )}
    </div>
  );
}
