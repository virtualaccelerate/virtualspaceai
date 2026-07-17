import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings as SettingsIcon, User, UserPlus, Building2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});

function SettingsPage() {
  const items = [
    { to: "/app/profile", icon: User, title: "Profile", desc: "Your name, avatar, and language." },
    { to: "/app/team", icon: UserPlus, title: "Team & invites", desc: "Manage members and roles." },
    { to: "/app", icon: Building2, title: "Teamspace", desc: "Workspace name and preferences." },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl text-white">Settings</h1>
      </div>
      <div className="grid gap-3">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="glass-strong rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition"
          >
            <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
              <it.icon className="h-4 w-4 text-white/70" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{it.title}</div>
              <div className="text-xs text-white/50">{it.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
