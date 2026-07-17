import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, User, LogOut, Menu, X, CheckSquare, BookOpen,
  Bot, BarChart3, Timer, Users, Bell, Search, Plus, Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Require a teamspace membership; otherwise send to onboarding
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

const NAV_MAIN = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare, exact: false, badge: "12" },
  { to: "/app/docs", label: "Knowledge Base", icon: BookOpen, exact: false },
  { to: "/app/agents", label: "AI Agents", icon: Bot, exact: false, badge: "3" },
] as const;

const NAV_INSIGHTS = [
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { to: "/app/time", label: "Time Tracking", icon: Timer, exact: false },
  { to: "/app/clients", label: "Clients", icon: Users, exact: false },
] as const;

const NAV_ACCOUNT = [
  { to: "/app/profile", label: "Profile", icon: User, exact: false },
] as const;

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const initial = (email?.[0] ?? "u").toUpperCase();

  const renderGroup = (label: string, items: readonly typeof NAV_MAIN[number][]) => (
    <div>
      <div className="px-3 pt-4 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-primary/15 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${active ? "text-primary" : "text-white/50 group-hover:text-white/80"}`} />
                {item.label}
              </span>
              {"badge" in item && item.badge && (
                <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-white/10 text-white/70">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-r border-white/10 bg-[color:var(--card)] transform transition-transform lg:translate-x-0 flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <Link to="/app" className="flex items-center gap-2">
            <VirtualSpaceLogo className="text-primary" size={24} />
            <span className="font-display font-extrabold text-white">Virtual Space</span>
          </Link>
          <button className="lg:hidden text-white/60" onClick={() => setMobileOpen(false)} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" />
            New task
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {renderGroup("Workspace", NAV_MAIN as unknown as typeof NAV_MAIN[number][])}
          {renderGroup("Insights", NAV_INSIGHTS as unknown as typeof NAV_MAIN[number][])}
          {renderGroup("Account", NAV_ACCOUNT as unknown as typeof NAV_MAIN[number][])}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/50 truncate">{email ?? ""}</div>
            </div>
            <button
              onClick={signOut}
              className="text-white/50 hover:text-white transition p-1.5 rounded-md hover:bg-white/5"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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
            className="lg:hidden text-white"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="search"
                placeholder="Search tasks, docs, agents…"
                className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-14 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40 border border-white/10 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              className="relative h-9 w-9 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <button
              className="h-9 w-9 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 ml-2 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
              {initial}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
