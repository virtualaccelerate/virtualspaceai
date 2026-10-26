import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Building2, ArrowRight, ArrowLeft, Users, LogOut, Check, HeartPulse, Plane, Laptop, Megaphone, ShoppingBag, Landmark, HardHat, GraduationCap, Handshake, Ellipsis, ListTodo, Wallet, UserRoundPlus, ChartNoAxesCombined, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { COMPANY_TEAM_SIZES, spaceName, type CompanySize } from "@/lib/teamspace-setup";

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
      { name: "description", content: "Set up your Virtual Space company workspace or join your team with an invite code." },
      { property: "og:title", content: "Set up your teamspace — Virtual Space" },
      { property: "og:description", content: "Personalize your company workspace and join your team in Virtual Space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const SIZES: { id: CompanySize; icon: typeof Users }[] = [
  { id: "1-10", icon: Users }, { id: "11-30", icon: Users },
  { id: "31-50", icon: Building2 }, { id: "51-100", icon: Building2 },
];
const INDUSTRIES = [
  { id: "healthcare", icon: HeartPulse }, { id: "travel", icon: Plane },
  { id: "digital", icon: Laptop }, { id: "marketing", icon: Megaphone },
  { id: "retail", icon: ShoppingBag }, { id: "finance", icon: Landmark },
  { id: "construction", icon: HardHat }, { id: "education", icon: GraduationCap },
  { id: "services", icon: Handshake }, { id: "other", icon: Ellipsis },
];
const PRIORITIES = [
  { id: "projects", icon: ListTodo }, { id: "team", icon: Users },
  { id: "finances", icon: Wallet }, { id: "hr", icon: UserRoundPlus },
  { id: "analytics", icon: ChartNoAxesCombined }, { id: "automation", icon: Zap },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [companySize, setCompanySize] = useState<CompanySize | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<string[]>([]);

  // Join form
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [autoJoining, setAutoJoining] = useState(() => Boolean(inviteCodeFromUrl()));

  useEffect(() => {
    const c = inviteCodeFromUrl();
    if (!c) return;
    setCode(c);
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
        setShowCode(true);
        setAutoJoining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient]);



  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || step !== 3 || !companySize || !industry || priorities.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const { data: profile, error: profileError } = await supabase.from("profiles")
        .select("full_name").eq("id", user.user.id).maybeSingle();
      if (profileError) throw profileError;
      const { error: err } = await supabase.from("teamspaces").insert({
        name: spaceName(profile?.full_name, user.user.email),
        team_size: COMPANY_TEAM_SIZES[companySize],
        business_type: "company",
        company_size: companySize,
        industry,
        priorities,
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
      <header className="px-6 py-5 flex items-center justify-end">
        <button onClick={signOut} className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5">
          <LogOut className="h-3.5 w-3.5" /> {t("app.header.signOut", "Sign out")}
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-strong w-full rounded-3xl p-5 sm:p-8"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                  <VirtualSpaceLogo size={28} />
                  <span className="font-display text-lg font-semibold text-foreground">Virtual Space</span>
                </div>
                <span className="text-sm text-foreground/60">{step} / 3</span>
              </div>
              <div role="progressbar" aria-label={t("teamspaceSetup.create")} aria-valuemin={0} aria-valuemax={3} aria-valuenow={step} className="h-1 rounded-full bg-foreground/10 overflow-hidden">
                <div className={`h-full bg-primary transition-all duration-300 motion-reduce:transition-none ${step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full"}`} />
              </div>
            </div>

            <form onSubmit={handleCreate} className="mt-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -12 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="space-y-5">
                  <div>
                    <h1 className="font-display text-2xl font-semibold text-foreground">{t(`teamspaceSetup.${step === 1 ? "size" : step === 2 ? "industry" : "priorities"}Title`)}</h1>
                    <p className="mt-2 text-sm text-foreground/60">{t(`teamspaceSetup.${step === 1 ? "size" : step === 2 ? "industry" : "priorities"}Subtitle`)}</p>
                  </div>
                  {step === 1 && (
                    <div role="radiogroup" aria-label={t("teamspaceSetup.sizeTitle")} className="grid gap-3">
                      {SIZES.map(({ id, icon: Icon }) => (
                        <label key={id} className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/40 ${companySize === id ? "border-primary bg-primary/10" : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"}`}>
                          <Icon className="h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-foreground">{id.replace("-", "–")}</div><div className="mt-1 text-xs text-foreground/55">{t(`teamspaceSetup.sizes.${id}`)}</div></div>
                          <input type="radio" name="company-size" value={id} checked={companySize === id} onChange={() => setCompanySize(id)} className="sr-only" />
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${companySize === id ? "border-primary" : "border-foreground/30"}`}>{companySize === id && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {step === 2 && (
                    <div role="radiogroup" aria-label={t("teamspaceSetup.industryTitle")} className="grid grid-cols-2 gap-3">
                      {INDUSTRIES.map(({ id, icon: Icon }) => (
                        <label key={id} className={`relative flex min-h-28 flex-col items-start gap-3 rounded-xl border p-3 sm:p-4 cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/40 ${industry === id ? "border-primary bg-primary/10" : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"}`}>
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
                          <span className="text-sm font-medium text-foreground break-words">{t(`teamspaceSetup.industries.${id}`)}</span>
                          <input type="radio" name="industry" value={id} checked={industry === id} onChange={() => setIndustry(id)} className="sr-only" />
                          {industry === id && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                        </label>
                      ))}
                    </div>
                  )}
                  {step === 3 && (
                    <div className="grid gap-3">
                      {PRIORITIES.map(({ id, icon: Icon }) => {
                        const selected = priorities.includes(id);
                        return (
                          <label key={id} className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition focus-within:ring-2 focus-within:ring-primary/40 ${selected ? "border-primary bg-primary/10" : "border-foreground/10 bg-foreground/5 hover:bg-foreground/10"}`}>
                            <Icon className="h-5 w-5 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-foreground">{t(`teamspaceSetup.priorities.${id}.title`)}</div><div className="mt-1 text-xs text-foreground/55">{t(`teamspaceSetup.priorities.${id}.description`)}</div></div>
                            <input type="checkbox" checked={selected} onChange={() => setPriorities((current) => selected ? current.filter((value) => value !== id) : [...current, id])} className="sr-only" />
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-foreground/30"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {!showCode && error && <p role="alert" className="mt-4 text-xs text-destructive">{error}</p>}
              <div className="mt-6 flex items-center gap-3">
                {step > 1 && <Button type="button" variant="ghost" disabled={loading} onClick={() => setStep((value) => value - 1)} className="rounded-full text-foreground/60"><ArrowLeft className="h-4 w-4" />{t("teamspaceSetup.back")}</Button>}
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep((value) => value + 1)} disabled={step === 1 ? !companySize : !industry} className="ml-auto rounded-full px-5 disabled:cursor-not-allowed">{t("teamspaceSetup.continue")}<ArrowRight className="h-4 w-4" /></Button>
                ) : (
                  <Button type="submit" disabled={loading || priorities.length === 0} className="ml-auto rounded-full px-5 disabled:cursor-not-allowed">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("teamspaceSetup.finish")}<ArrowRight className="h-4 w-4" /></>}</Button>
                )}
              </div>
            </form>
          </motion.div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => { setShowCode((value) => !value); setError(null); }}
              className="text-xs text-white/50 hover:text-white underline-offset-4 hover:underline"
            >
              {t("teamspaceSetup.haveCode", "У меня есть код приглашения")}
            </button>
          </div>

          {showCode && (
            <form onSubmit={handleJoin} className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. 5b91a3f24c8d"
                  aria-label={t("teamspaceSetup.haveCode", "У меня есть код приглашения")}
                  className="glass w-full rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>
              <Button type="submit" disabled={loading || !code.trim()} className="shrink-0 rounded-full px-5 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("teamspaceSetup.join", "Присоединиться")}
              </Button>
            </form>
          )}
          {showCode && error && <p role="alert" className="mt-2 text-center text-xs text-destructive">{error}</p>}
        </div>
      </main>
    </div>
  );
}
