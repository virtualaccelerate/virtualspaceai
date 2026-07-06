import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowUpRight, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppDashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Profile = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function AppDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile({
        full_name: data?.full_name ?? null,
        email: data?.email ?? userData.user.email ?? null,
        avatar_url: data?.avatar_url ?? null,
      });
    })();
  }, []);

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "there";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-primary/80">Welcome back</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl text-white">
          Hi, {displayName} 👋
        </h1>
        <p className="mt-2 text-white/60 max-w-xl">
          Your workspace is ready. New pages and AI agents will appear here as they launch.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlaceholderCard
          icon={LayoutDashboard}
          title="Overview"
          body="A summary of activity across your workspace will live here."
          badge="Coming soon"
        />
        <PlaceholderCard
          icon={Sparkles}
          title="AI Agents"
          body="Create, monitor, and orchestrate your AI agents."
          badge="Coming soon"
        />
        <PlaceholderCard
          icon={ArrowUpRight}
          title="Integrations"
          body="Connect your tools and data sources to Virtual Space."
          badge="Coming soon"
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="glass-strong rounded-3xl p-6 sm:p-8"
      >
        <h2 className="font-display text-xl text-white">What's next</h2>
        <p className="mt-2 text-sm text-white/60">
          This dashboard is the entry point for everything you'll build in Virtual Space.
          As new pages are added, they'll appear in the sidebar automatically.
        </p>
      </motion.div>
    </div>
  );
}

function PlaceholderCard({
  icon: Icon,
  title,
  body,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 hover:bg-white/5 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {badge && (
          <span className="text-[10px] uppercase tracking-widest text-white/40 border border-white/10 rounded-full px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/60">{body}</p>
    </div>
  );
}
