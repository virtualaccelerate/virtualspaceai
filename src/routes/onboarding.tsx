import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Rocket, Briefcase, Building2, ArrowRight, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { useQueryClient } from "@tanstack/react-query";

function inviteCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get("code");
  return code && code.trim() ? code.trim() : null;
}

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const code = inviteCodeFromUrl();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // Keep the invite code through sign-in/sign-up so the link still works.
      throw redirect({ href: code ? `/auth?next=${encodeURIComponent(`/onboarding?code=${code}`)}` : "/auth" });
    }
    // With an invite code we always show the join step, even for users who
    // already belong to another workspace.
    if (code) return { user: data.user };
    const { data: membership } = await supabase
      .from("teamspace_members")
      .select("teamspace_id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();
    if (membership) throw redirect({ to: "/app" });
    return { user: data.user };
  },
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Set up your teamspace — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Tab = "create" | "join";
type TeamSize = "1-5" | "5-20" | "20+";
type BusinessType = "startup" | "agency" | "company";

const SIZES: TeamSize[] = ["1-5", "5-20", "20+"];
const BUSINESS: { id: BusinessType; icon: typeof Rocket; title: string; desc: string }[] = [
  { id: "startup", icon: Rocket, title: "Startup", desc: "Fast-moving team, all hands on deck" },
  { id: "agency", icon: Briefcase, title: "Agency", desc: "Client projects, creative workflows" },
  { id: "company", icon: Building2, title: "Company", desc: "Established team, structured ops" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("create");

  // Create form
  const [name, setName] = useState("");
  const [teamSize, setTeamSize] = useState<TeamSize>("1-5");
  const [businessType, setBusinessType] = useState<BusinessType>("startup");

  // Join form
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoJoining, setAutoJoining] = useState(() => Boolean(inviteCodeFromUrl()));

  useEffect(() => {
    const c = inviteCodeFromUrl();
    if (!c) return;
    setCode(c);
    setTab("join");
    // Invite links join straight away — no extra step for the new member.
    let cancelled = false;
    (async () => {
      try {
        const { joinTeamspaceByCodeFn } = await import("@/lib/teamspace-join.functions");
        await joinTeamspaceByCodeFn({ data: { code: c } });
        if (cancelled) return;
        await queryClient.invalidateQueries();
        navigate({ to: "/app", replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Invalid invite code");
        setAutoJoining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);



  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const { error: err } = await supabase.from("teamspaces").insert({
        name: name.trim(),
        team_size: teamSize,
        business_type: businessType,
        owner_id: user.user.id,
      });
      if (err) throw err;
      await queryClient.invalidateQueries();
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create teamspace");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { joinTeamspaceByCodeFn } = await import("@/lib/teamspace-join.functions");
      await joinTeamspaceByCodeFn({ data: { code: code.trim() } });
      await queryClient.invalidateQueries();
      navigate({ to: "/app", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid invite code");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (autoJoining) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <VirtualSpaceLogo className="text-primary" size={30} />
        <div className="inline-flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" /> Joining workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <VirtualSpaceLogo className="text-primary" size={26} />
          <span className="font-display font-extrabold tracking-tight text-lg text-white">Virtual Space</span>
        </div>
        <button onClick={signOut} className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-strong w-full max-w-2xl rounded-3xl p-8"
        >
          <h1 className="font-display text-3xl text-white text-center">Set up your teamspace</h1>
          <p className="mt-2 text-sm text-white/60 text-center">
            Create a new workspace for your team or join an existing one with an invite code.
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-white/5 p-1 max-w-sm mx-auto">
            <button
              onClick={() => { setTab("create"); setError(null); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                tab === "create" ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
              }`}
            >
              Create new
            </button>
            <button
              onClick={() => { setTab("join"); setError(null); }}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                tab === "join" ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
              }`}
            >
              Join with code
            </button>
          </div>

          {tab === "create" ? (
            <form onSubmit={handleCreate} className="mt-8 space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-white/50">Workspace name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Inc."
                  className="mt-2 glass w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-white/50">What best describes your team?</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {BUSINESS.map((b) => {
                    const active = businessType === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBusinessType(b.id)}
                        className={`text-left rounded-xl p-4 border transition ${
                          active
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <b.icon className={`h-5 w-5 mb-3 ${active ? "text-primary" : "text-white/60"}`} />
                        <div className="font-semibold text-white text-sm">{b.title}</div>
                        <div className="text-xs text-white/55 mt-1">{b.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-white/50">Team size</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SIZES.map((s) => {
                    const active = teamSize === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTeamSize(s)}
                        className={`rounded-xl py-3 text-sm font-medium transition border ${
                          active
                            ? "border-primary bg-primary/10 text-white ring-2 ring-primary/40"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create teamspace <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="mt-8 space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-white/50">Invite code</label>
                <div className="relative mt-2">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 5b91a3f24c8d"
                    className="glass w-full rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/50">
                  Ask your teamspace owner for the invite code.
                </p>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join teamspace <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
