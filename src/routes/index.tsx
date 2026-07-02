import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Bot, Zap, Clock, PiggyBank, Workflow, Rocket, Building2,
  HeartHandshake, Sparkles, Brain, BellRing, BookOpen,
  ArrowRight, CheckCircle2, Globe, Check, Sun, Moon, Menu,
} from "lucide-react";
import "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { Brandbook } from "@/components/Brandbook";
import { AnimatedTaskTable } from "@/components/AnimatedTaskTable";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";

export const Route = createFileRoute("/")({
  component: Landing,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

function LangSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ?? LANGUAGES[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-white/90 hover:text-white transition"
        aria-label="Language"
      >
        <Globe className="h-3.5 w-3.5" />
        {current.label}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong absolute right-0 mt-2 w-32 rounded-2xl p-1.5 z-50"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false); }}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/10 transition"
            >
              {l.label}
              {l.code === current.code && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light" | null) ?? "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="glass inline-flex items-center justify-center rounded-full h-9 w-9 text-white/90 hover:text-white transition"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}

function Header() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "#learn", label: t("nav.learn") },
    { href: "#mentors", label: t("nav.mentors") },
    { href: "#courses", label: t("nav.courses") },
    { href: "#product", label: t("nav.product") },
    { href: "#price", label: t("nav.pricing") },
    { href: "#demo", label: t("nav.bookDemo") },
  ];

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 sm:pt-4">
      <div className="glass mx-auto max-w-6xl rounded-full px-3 sm:px-5 h-14 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 shrink-0">
          <VirtualSpaceLogo className="text-primary" size={28} />
          <span className="font-display font-extrabold tracking-tight text-lg text-white">Virtual Space</span>
        </a>

        <nav className="hidden lg:flex items-center gap-5 text-sm">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-white/70 hover:text-white transition whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 text-sm">
            <a href="#login" className="text-white/70 hover:text-white transition whitespace-nowrap">
              {t("nav.login")}
            </a>
            <a href="#signup" className="text-white/70 hover:text-white transition whitespace-nowrap">
              {t("nav.signup")}
            </a>
          </div>

          <ThemeToggle />
          <LangSwitcher />

          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Menu"
                  className="glass inline-flex items-center justify-center rounded-full h-9 w-9 text-white/90 hover:text-white transition"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-strong w-[300px] border-white/10">
                <nav className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="text-lg text-white/80 hover:text-white transition"
                    >
                      {link.label}
                    </a>
                  ))}
                  <hr className="border-white/10 my-2" />
                  <a href="#login" onClick={() => setMobileOpen(false)} className="text-lg text-white/80 hover:text-white transition">
                    {t("nav.login")}
                  </a>
                  <a href="#signup" onClick={() => setMobileOpen(false)} className="text-lg text-white/80 hover:text-white transition">
                    {t("nav.signup")}
                  </a>
                  <a
                    href="#demo"
                    onClick={() => setMobileOpen(false)}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
                  >
                    {t("nav.cta")}
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <a
            href="#demo"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition"
          >
            {t("nav.cta")}
          </a>
        </div>
      </div>
    </header>
  );
}

function GlassCard({
  tag, title, body, icon: Icon, children, gradient,
}: {
  tag: string; title: string; body: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode; gradient: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8 min-h-[420px] flex flex-col"
    >
      <div
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ background: gradient }}
      />
      <div className="relative flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-[0.2em] text-primary uppercase">
        <Icon className="h-4 w-4" />
        {tag}
      </div>
      <h3 className="relative mt-4 font-display text-3xl sm:text-4xl text-white leading-tight">
        {title}
      </h3>
      <p className="relative mt-3 text-sm sm:text-base text-white/60 leading-relaxed">{body}</p>
      <div className="relative mt-auto pt-6">{children}</div>
    </motion.div>
  );
}

function ChatBubble({ who, time, children, accent }: { who: string; time: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-3 sm:p-4 ${accent ? "border-primary/30" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-white/70">
        <div className={`h-6 w-6 rounded-full ${accent ? "bg-gradient-to-br from-primary to-[oklch(0.75_0.18_140)]" : "bg-white/20"}`} />
        <span className="font-medium text-white/90">{who}</span>
        <span className="text-white/40">{time}</span>
      </div>
      <div className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed">{children}</div>
    </div>
  );
}

function Landing() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language?.split("-")[0] ?? "en";
  }, [i18n.language]);

  const benefitCards = [
    { key: "money", icon: PiggyBank },
    { key: "time", icon: Clock },
    { key: "auto", icon: Workflow },
  ] as const;

  const audience = [
    { key: "startups", icon: Rocket, gradient: "linear-gradient(135deg, oklch(0.62 0.18 155), oklch(0.75 0.15 130))" },
    { key: "entrepreneurs", icon: Building2, gradient: "linear-gradient(135deg, oklch(0.7 0.14 145), oklch(0.9 0.03 150))" },
    { key: "ngo", icon: HeartHandshake, gradient: "linear-gradient(135deg, oklch(0.6 0.16 165), oklch(0.72 0.12 180))" },
  ] as const;

  return (
    <div id="top" className="min-h-screen text-white overflow-hidden">
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[56px] leading-[1.1] text-white"
              >
                {t("hero.title")}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.25 }}
                className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                {t("hero.subtitle")}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.35 }}
                className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                {t("hero.subtitle2")}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
              >
                <a
                  href="#demo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)]"
                >
                  {t("hero.cta")} <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#demo"
                  className="glass w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition"
                >
                  {t("hero.cta2")}
                </a>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.55 }}
                className="mt-6 text-sm text-white/40 max-w-xl mx-auto lg:mx-0"
              >
                {t("hero.tagline")}
              </motion.p>
            </div>

            {/* Right: Orbital visual with real logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative flex items-center justify-center mt-8 lg:mt-0"
            >
              <div className="relative w-full max-w-[420px] sm:max-w-[480px] aspect-square mx-auto">
                {/* Ambient glow */}
                <div
                  className="absolute inset-6 rounded-full blur-3xl opacity-60 pointer-events-none"
                  style={{ background: "radial-gradient(circle, oklch(0.80 0.22 138 / 0.45), transparent 65%)" }}
                />

                {/* Rotating outer ring with dots */}
                <motion.svg
                  viewBox="0 0 400 400"
                  className="absolute inset-0 w-full h-full text-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 6" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <circle key={`o-${angle}`} cx={200 + 190 * Math.cos(rad)} cy={200 + 190 * Math.sin(rad)} r="5" fill="currentColor" />
                    );
                  })}
                </motion.svg>

                {/* Middle ring — counter-rotating */}
                <motion.svg
                  viewBox="0 0 400 400"
                  className="absolute inset-0 w-full h-full text-primary"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                >
                  <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
                  {[22.5, 112.5, 202.5, 292.5].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <circle key={`m-${angle}`} cx={200 + 140 * Math.cos(rad)} cy={200 + 140 * Math.sin(rad)} r="4" fill="currentColor" opacity="0.9" />
                    );
                  })}
                </motion.svg>

                {/* Inner ring — slow rotation */}
                <motion.svg
                  viewBox="0 0 400 400"
                  className="absolute inset-0 w-full h-full text-primary"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                >
                  <circle cx="200" cy="200" r="95" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
                  {[0, 120, 240].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <circle key={`i-${angle}`} cx={200 + 95 * Math.cos(rad)} cy={200 + 95 * Math.sin(rad)} r="3.5" fill="currentColor" />
                    );
                  })}
                </motion.svg>

                {/* Center: real logo with float */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <div
                      className="absolute inset-0 rounded-full blur-2xl opacity-70"
                      style={{ background: "radial-gradient(circle, oklch(0.80 0.22 138 / 0.6), transparent 70%)" }}
                    />
                    <VirtualSpaceLogo size={160} className="relative drop-shadow-[0_10px_30px_oklch(0.80_0.22_138_/_0.5)]" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW ERA */}
      <section id="new-era" className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="glass-strong rounded-[32px] p-6 sm:p-12 md:p-16 relative overflow-hidden"
          >
            <div
              className="absolute -top-32 -left-32 h-80 w-80 rounded-full opacity-40 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, oklch(0.80 0.22 138 / 0.7), transparent 70%)" }}
            />
            <div
              className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full opacity-30 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, oklch(0.91 0.16 138 / 0.6), transparent 70%)" }}
            />
            <div className="relative grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary/90 font-mono">
                  {t("newEra.eyebrow")}
                </p>
                <h2 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
                  {t("newEra.title")} <span className="grad-accent">{t("newEra.titleAccent")}</span>
                </h2>
                <p className="mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl">
                  {t("newEra.body1")}
                </p>
                <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl">
                  {t("newEra.body2")}
                </p>
                <div className="mt-8 grid sm:grid-cols-3 gap-3">
                  {[
                    { icon: Brain, label: t("newEra.pill1") },
                    { icon: Zap, label: t("newEra.pill2") },
                    { icon: Workflow, label: t("newEra.pill3") },
                  ].map((p, i) => (
                    <div key={i} className="glass rounded-2xl px-4 py-3 flex items-center gap-2.5">
                      <p.icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-white/85">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="relative w-full max-w-[380px] aspect-square">
                  <div className="absolute inset-0 rounded-full opacity-30 blur-3xl"
                    style={{ background: "radial-gradient(circle, #73D94F, transparent 60%)" }} />
                  <div className="relative w-full h-full flex items-center justify-center">
                    <VirtualSpaceLogo size={280} className="text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES — 3 glass cards */}
      <section id="learn" className="relative">

        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp}
            className="max-w-3xl"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary/80">{t("features.eyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-6xl leading-tight text-white">
              {t("features.title")} <span className="grad-accent">{t("features.titleAccent")}</span>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            className="mt-12 sm:mt-16 grid md:grid-cols-3 gap-4 sm:gap-6"
          >
            <GlassCard
              tag={t("features.kb.tag")}
              title={t("features.kb.title")}
              body={t("features.kb.body")}
              icon={BookOpen}
              gradient="radial-gradient(circle, oklch(0.72 0.18 150 / 0.85), transparent 70%)"
            >
              <ChatBubble who="Alex" time="9:12">Where's the onboarding doc for engineers?</ChatBubble>
              <div className="h-2" />
              <ChatBubble who="@Brain" time="9:12" accent>
                Onboarding v3.2 — <span className="text-primary">/docs/eng-onboarding</span>. Includes access map + first-week checklist.
              </ChatBubble>
            </GlassCard>

            <GlassCard
              tag={t("features.owner.tag")}
              title={t("features.owner.title")}
              body={t("features.owner.body")}
              icon={Brain}
              gradient="radial-gradient(circle, oklch(0.82 0.15 135 / 0.75), transparent 70%)"
            >
              <div className="glass rounded-2xl p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-white/60"><span>MRR</span><span className="text-white font-semibold">$142k <span className="text-[oklch(0.75_0.2_150)]">+8%</span></span></div>
                <div className="flex justify-between text-white/60"><span>Pipeline</span><span className="text-white font-semibold">$610k</span></div>
                <div className="flex justify-between text-white/60"><span>Needs you</span><span className="text-primary font-semibold">3 items</span></div>
              </div>
            </GlassCard>

            <GlassCard
              tag={t("features.reminders.tag")}
              title={t("features.reminders.title")}
              body={t("features.reminders.body")}
              icon={BellRing}
              gradient="radial-gradient(circle, oklch(0.95 0.02 150 / 0.7), transparent 70%)"
            >
              <div className="glass rounded-2xl p-4 space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-2">
                  <BellRing className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white/90 font-medium">Follow up: Acme Corp</div>
                    <div className="text-white/50">No reply for 3 days · Deal $24k</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.75_0.2_150)] mt-0.5 shrink-0" />
                  <div className="text-white/70">Sent by agent · 8:00am</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="max-w-3xl"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary/80">{t("benefits.eyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-6xl leading-tight text-white">
              {t("benefits.title")} <em className="italic grad-accent">{t("benefits.titleAccent")}</em>
            </h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6"
          >
            {benefitCards.map((c) => (
              <motion.div key={c.key} variants={fadeUp} className="glass rounded-3xl p-6 sm:p-8 hover:bg-white/10 transition">
                <c.icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <h3 className="mt-6 text-2xl text-white">{t(`benefits.cards.${c.key}.title`)}</h3>
                <p className="mt-3 text-white/60 leading-relaxed text-sm sm:text-base">{t(`benefits.cards.${c.key}.body1`)}</p>
                <p className="mt-3 text-white/60 leading-relaxed text-sm sm:text-base">{t(`benefits.cards.${c.key}.body2`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <AnimatedTaskTable />

      {/* AUDIENCE */}
      <section id="price" className="relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="text-center max-w-3xl mx-auto"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-primary/80">{t("audience.eyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-6xl leading-tight text-white">
              {t("audience.title")} <em className="italic grad-accent">{t("audience.titleAccent")}</em>
            </h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6"
          >
            {audience.map((a) => (
              <motion.div
                key={a.key} variants={fadeUp}
                className="glass-strong relative overflow-hidden rounded-3xl p-6 sm:p-8 min-h-[300px] flex flex-col"
              >
                <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl" style={{ background: a.gradient }} />
                <a.icon className="relative h-8 w-8 text-white" strokeWidth={1.5} />
                <div className="relative mt-auto">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">{t(`audience.${a.key}.tag`)}</p>
                  <h3 className="mt-2 font-display text-4xl text-white">{t(`audience.${a.key}.title`)}</h3>
                  <p className="mt-3 text-white/70 text-sm sm:text-base">{t(`audience.${a.key}.body`)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Brandbook />

      {/* CTA */}
      <section id="demo" className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="glass-strong rounded-[32px] p-6 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(60% 60% at 50% 0%, oklch(0.72 0.18 155 / 0.5), transparent 70%)" }} />
            <h2 className="relative font-display text-4xl sm:text-6xl md:text-7xl leading-[1.05] text-white">
              {t("cta.title1")} <em className="italic grad-accent">{t("cta.title2")}</em>
            </h2>
            <p className="relative mt-5 text-base sm:text-lg text-white/60 max-w-xl mx-auto">{t("cta.subtitle")}</p>

            <form
              onSubmit={(e) => { e.preventDefault(); alert(t("cta.thanks")); }}
              className="relative mt-10 max-w-xl mx-auto grid gap-3"
            >
              <input required placeholder={t("cta.name")}
                className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input required type="text" placeholder={t("cta.contact")}
                className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input placeholder={t("cta.company")}
                className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <button type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-6 py-4 font-semibold hover:bg-white/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)]">
                {t("cta.submit")} <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/50">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note1")}</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note2")}</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note3")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div className="flex items-center gap-2">
            <VirtualSpaceLogo className="text-primary" size={22} />
            <span className="font-display font-extrabold tracking-tight text-base text-white">Virtual Space</span>
          </div>
          <p>© {new Date().getFullYear()} Virtual Space. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
