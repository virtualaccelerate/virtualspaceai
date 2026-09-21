import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon, User, UserPlus, Building2, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getActiveTeamspaceId, listMyTeamspaces, removeTeamspaceLogo, uploadTeamspaceLogo, type TeamspaceSummary } from "@/lib/active-teamspace";
import { deleteTeamspace } from "@/lib/teamspaces.functions";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});

function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [teamspace, setTeamspace] = useState<TeamspaceSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const canManage = teamspace?.role === "owner" || teamspace?.role === "admin";

  const loadTeamspace = async () => {
    const [rows, activeId] = await Promise.all([listMyTeamspaces(), getActiveTeamspaceId()]);
    setTeamspace(rows.find((row) => row.id === activeId) ?? rows[0] ?? null);
  };

  useEffect(() => { void loadTeamspace(); }, []);

  const uploadLogo = async (file: File) => {
    if (!teamspace) return;
    setBusy(true);
    try {
      await uploadTeamspaceLogo(teamspace, file);
      await loadTeamspace();
      toast.success(t("app.settings.logo.saved", "Логотип обновлён"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    if (!teamspace) return;
    setBusy(true);
    try {
      await removeTeamspaceLogo(teamspace);
      await loadTeamspace();
      toast.success(t("app.settings.logo.removed", "Логотип удалён"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const removeTeamspace = async () => {
    if (!teamspace || teamspace.role !== "owner") return;
    setDeleteBusy(true);
    try {
      const result = await deleteTeamspace({ data: { teamspaceId: teamspace.id } });
      toast.success(t("app.settings.delete.success", "Рабочее пространство удалено"));
      if (result.nextTeamspaceId) window.location.assign("/app");
      else navigate({ to: "/onboarding", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setDeleteBusy(false);
    }
  };
  const items = [
    { to: "/app/profile", icon: User, title: t("app.settings.profile.title", "Profile"), desc: t("app.settings.profile.desc", "Your name, avatar, and language.") },
    { to: "/app/team", icon: UserPlus, title: t("app.settings.team.title", "Team & invites"), desc: t("app.settings.team.desc", "Manage members and roles.") },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl text-foreground">{t("app.nav.settings", "Settings")}</h1>
      </div>
      <div className="grid gap-3">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="glass-strong rounded-lg p-4 flex items-center gap-4 hover:bg-accent/40 transition"
          >
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <it.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{it.title}</div>
              <div className="text-xs text-muted-foreground">{it.desc}</div>
            </div>
          </Link>
        ))}
      </div>
      <section className="mt-8 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("app.settings.teamspace.title", "Рабочее пространство")}</h2>
            <p className="text-xs text-muted-foreground">{teamspace?.name ?? t("app.header.loading", "Загрузка…")}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-primary/15 text-lg font-bold text-primary">
            {teamspace?.logo_url ? (
              <img src={teamspace.logo_url} alt={t("app.settings.logo.alt", "Логотип рабочего пространства")} className="h-full w-full object-cover" />
            ) : (
              (teamspace?.name?.[0] ?? "T").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{t("app.settings.logo.title", "Логотип пространства")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("app.settings.logo.hint", "PNG, JPG или WebP, не более 2 МБ")}</div>
            {canManage ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file);
                }} />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  {teamspace?.logo_path ? t("app.settings.logo.replace", "Заменить") : t("app.settings.logo.upload", "Загрузить")}
                </Button>
                {teamspace?.logo_path && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void removeLogo()} className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> {t("app.settings.logo.remove", "Удалить")}
                  </Button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{t("app.settings.logo.ownerOnly", "Изменить логотип может владелец или администратор пространства")}</p>
            )}
          </div>
        </div>
      </section>
      {teamspace?.role === "owner" && (
        <section className="mt-8 border-t border-destructive/30 pt-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t("app.settings.delete.title", "Удаление пространства")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("app.settings.delete.hint", "Все задачи, документы, чаты и настройки пространства будут удалены безвозвратно.")}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleteBusy} className="shrink-0">
                  {deleteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {t("app.settings.delete.button", "Удалить")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("app.settings.delete.confirmTitle", "Удалить {{name}}?", { name: teamspace.name })}</AlertDialogTitle>
                  <AlertDialogDescription>{t("app.settings.delete.confirmBody", "Отменить это действие невозможно. Все данные рабочего пространства будут удалены.")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel", "Отмена")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void removeTeamspace()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t("app.settings.delete.confirm", "Удалить навсегда")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </div>
  );
}
