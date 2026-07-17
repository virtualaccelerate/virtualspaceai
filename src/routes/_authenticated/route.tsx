import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  LayoutDashboard, User, LogOut, X, CheckSquare, BookOpen,
  Bot, Users, Bell, Search, Plus, Settings,
  ChevronDown, UserPlus, Copy, Check, Sparkles,
  MessageSquare, Wallet, PanelLeftClose, PanelLeftOpen, Send as SendIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitcher } from "@/components/LangSwitcher";



export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: membership } = await supabase
      .from("teamspace_members")
      .select("teamspace_id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    if (!membership) throw redirect({ to: "/onboarding" });
    return { user: data.user, teamspaceId: membership.teamspace_id };
  },
  component: AuthenticatedLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  exact?: boolean;
};

type Teamspace = { id: string; name: string; invite_code: string };

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M9.78 17.26 9.6 20.2c.27 0 .39-.12.53-.26l1.28-1.22 2.65 1.94c.49.27.84.13.97-.45l1.76-8.25c.16-.73-.26-1.01-.74-.83L4.62 14.7c-.71.28-.7.68-.13.86l2.63.82 6.11-3.86c.29-.19.55-.09.34.11" />
  </svg>
);

function AuthenticatedLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("app.sidebar.expanded") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [teamspace, setTeamspace] = useState<Teamspace | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("app.sidebar.expanded", expanded ? "1" : "0");
    }
  }, [expanded]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (!data.user) return;
      const { data: mem } = await supabase
        .from("teamspace_members")
        .select("teamspace_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();
      if (!mem) return;
      const { data: ts } = await supabase
        .from("teamspaces")
        .select("id, name, invite_code")
        .eq("id", mem.teamspace_id)
        .maybeSingle();
      if (ts) setTeamspace(ts as Teamspace);
    })();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const initial = (email?.[0] ?? "u").toUpperCase();
  const tsInitial = (teamspace?.name?.[0] ?? "T").toUpperCase();

  const mainNav: NavItem[] = [
    { to: "/app", label: t("app.nav.home", "Home"), icon: MessageSquare, exact: true },
    { to: "/app/overview", label: t("app.nav.overview"), icon: LayoutDashboard },
    { to: "/app/docs", label: t("app.nav.knowledgeBase"), icon: BookOpen },
    { to: "/app/tasks", label: t("app.nav.tasks"), icon: CheckSquare },
    { to: "/app/agents", label: t("app.nav.aiAgents"), icon: Bot },
    { to: "/app/financials", label: t("app.nav.financials", "Financials"), icon: Wallet },
    { to: "/app/telegram", label: t("app.nav.telegram", "Telegram"), icon: TelegramIcon },
    { to: "/app/team", label: t("app.nav.team", "Team"), icon: Users },
  ];

  const bottomNav: NavItem[] = [
    { to: "/app/settings", label: t("app.nav.settings", "Settings"), icon: Settings },
  ];

  const showLabels = expanded || mobileOpen;
  const railWidth = showLabels ? "w-64" : "w-[68px]";

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.to, item.exact);
    return (
      <Link
        to={item.to}
        title={showLabels ? undefined : item.label}
        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
          active ? "bg-primary/15 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
          active ? "text-primary" : "text-white/60 group-hover:text-white/90"
        }`}>
          <item.icon className="h-[18px] w-[18px]" />
        </span>
        {showLabels && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen ${railWidth} shrink-0 border-r border-white/10 bg-[color:var(--card)] transform transition-all duration-200 lg:translate-x-0 flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: teamspace + collapse */}
        <div className="relative px-2 pt-2 pb-2 border-b border-white/10" ref={menuRef}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => showLabels && setMenuOpen((v) => !v)}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5 transition text-left min-w-0 ${
                showLabels ? "" : "justify-center"
              }`}
              title={teamspace?.name ?? ""}
            >
              <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {teamspace ? tsInitial : <Sparkles className="h-4 w-4" />}
              </div>
              {showLabels && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      {teamspace?.name ?? t("app.header.loading")}
                    </div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">
                      {t("app.header.teamspace")}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white/50 shrink-0 transition ${menuOpen ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
            {mobileOpen && (
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-white/60 p-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {menuOpen && showLabels && (
            <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-xl border border-white/10 bg-[color:var(--card)] shadow-2xl overflow-hidden">
              <div className="px-3 py-2.5 border-b border-white/5">
                <div className="text-[10px] uppercase tracking-wider text-white/40">{t("app.header.signedInAs")}</div>
                <div className="text-xs text-white/80 truncate mt-0.5">{email}</div>
              </div>
              <MenuItem icon={User} label={t("app.nav.profile")}
                onClick={() => { setMenuOpen(false); navigate({ to: "/app/profile" }); }} />
              <MenuItem icon={UserPlus} label={t("app.header.inviteMembers")}
                onClick={() => { setMenuOpen(false); setInviteOpen(true); }} />
              <MenuItem icon={Settings} label={t("app.header.teamspaceSettings")}
                onClick={() => { setMenuOpen(false); navigate({ to: "/app/settings" }); }} />
              <div className="border-t border-white/5" />
              <MenuItem icon={LogOut} label={t("app.header.signOut")} onClick={signOut} danger />
            </div>
          )}
        </div>

        {/* Collapse toggle + New */}
        <div className="px-2 pt-2 space-y-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`hidden lg:flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition ${
              showLabels ? "" : "justify-center"
            }`}
            title={showLabels ? "Collapse" : "Expand"}
          >
            <span className="h-8 w-8 flex items-center justify-center">
              {showLabels ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
            </span>
            {showLabels && <span>Collapse</span>}
          </button>
          <button
            onClick={() => navigate({ to: "/app/tasks" })}
            className={`w-full flex items-center gap-3 rounded-lg bg-primary text-primary-foreground px-2.5 py-2 text-sm font-semibold hover:bg-primary/90 transition ${
              showLabels ? "" : "justify-center"
            }`}
            title={t("app.header.newTask")}
          >
            <span className="h-8 w-8 flex items-center justify-center">
              <Plus className="h-[18px] w-[18px]" />
            </span>
            {showLabels && <span>{t("app.header.newTask")}</span>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 mt-1">
          {mainNav.map((item) => <NavButton key={item.to} item={item} />)}
        </nav>

        <div className="p-2 border-t border-white/10 space-y-0.5">
          {bottomNav.map((item) => <NavButton key={item.to} item={item} />)}
          <Link
            to="/app/profile"
            title={showLabels ? undefined : email ?? ""}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-white/5 transition ${
              showLabels ? "" : "justify-center"
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {initial}
            </div>
            {showLabels && (
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white/70 truncate">{email ?? ""}</div>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 border-b border-white/10 bg-background/80 backdrop-blur px-4 sm:px-6 flex items-center gap-3">
          <button
            className="lg:hidden text-white/80 p-1.5 -ml-1.5 rounded-md hover:bg-white/5"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="search"
                placeholder={t("app.header.search")}
                className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-14 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40 border border-white/10 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setInviteOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("app.header.invite")}
            </button>
            <LangSwitcher />
            <ThemeToggle />
            <button
              className="relative h-9 w-9 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>

            <button
              onClick={() => navigate({ to: "/app/settings" })}
              className="h-9 w-9 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {inviteOpen && teamspace && (
        <InviteModal teamspace={teamspace} onClose={() => setInviteOpen(false)} />
      )}
    </div>
  );
}


function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof User;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition text-left ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-white/80 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function InviteModal({ teamspace, onClose }: { teamspace: Teamspace; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/onboarding?code=${teamspace.invite_code}`
    : `/onboarding?code=${teamspace.invite_code}`;

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[color:var(--card)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-lg text-white">{t("app.invite.title")} {teamspace.name}</h3>
              <p className="text-xs text-white/55">{t("app.invite.subtitle")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/50">{t("app.invite.code")}</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                readOnly
                value={teamspace.invite_code}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white font-mono"
              />
              <button
                onClick={() => copy(teamspace.invite_code, "code")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold hover:bg-primary/90 transition"
              >
                {copied === "code" ? <><Check className="h-3.5 w-3.5" /> {t("app.invite.copied")}</> : <><Copy className="h-3.5 w-3.5" /> {t("app.invite.copy")}</>}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/50">{t("app.invite.link")}</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white/80 truncate"
              />
              <button
                onClick={() => copy(link, "link")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                {copied === "link" ? <><Check className="h-3.5 w-3.5" /> {t("app.invite.copied")}</> : <><Copy className="h-3.5 w-3.5" /> {t("app.invite.copy")}</>}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-white/50">
          {t("app.invite.hint")}
        </p>

      </div>
    </div>
  );
}
