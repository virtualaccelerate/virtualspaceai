import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, User, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 border-r border-white/10 bg-[color:var(--card)] transform transition-transform lg:translate-x-0 ${
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
        <nav className="p-3 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive(item.to, item.exact)
                  ? "bg-primary/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/50 truncate">{email ?? ""}</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
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
        <header className="lg:hidden sticky top-0 z-20 h-14 border-b border-white/10 bg-background/80 backdrop-blur px-4 flex items-center gap-3">
          <button className="text-white" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/app" className="flex items-center gap-2">
            <VirtualSpaceLogo className="text-primary" size={22} />
            <span className="font-display font-extrabold text-white">Virtual Space</span>
          </Link>
        </header>
        <main className="flex-1 p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
