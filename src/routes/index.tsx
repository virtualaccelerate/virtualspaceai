import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Zap, Clock, Wallet, Workflow, Rocket, Building2,
  HeartHandshake, BellRing, BookOpen,
  ArrowRight, CheckCircle2, Globe, Check, Sun, Moon, Menu, Brain, ChevronDown, Loader2, X,
} from "lucide-react";
import "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";
import { Brandbook } from "@/components/Brandbook";
import { AnimatedTaskTable } from "@/components/AnimatedTaskTable";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { submitDemoRequest } from "@/lib/demo-request.functions";
import vaLogoDark from "@/assets/Untitled_design_21.png.asset.json";
import vaLogoLight from "@/assets/Untitled_design_22.png.asset.json";
import aiBusinessEra from "@/assets/ai-business-era.jpg.asset.json";
import heroBg from "@/assets/hero-bg.jpg.asset.json";
import startupsBg from "@/assets/startups-bg.jpg.asset.json";
import ngosBg from "@/assets/ngos-bg.jpg.asset.json";


const SITE_URL = "https://virtualspaceai.lovable.app";
const OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/62b5b4ec-67c8-4341-8918-1ce79a7d68ce";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Virtual Space — AI-agentic workspace for business" },
      { name: "description", content: "One workspace for your team, tools, and AI agents. Connect apps, automate workflows, and ship faster with AI at the center of your business." },
      { property: "og:title", content: "Virtual Space — AI-agentic workspace for business" },
      { property: "og:description", content: "One workspace for your team, tools, and AI agents. Connect apps, automate workflows, and ship faster with AI at the center of your business." },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Virtual Space",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: "AI-agentic workspace that connects teams, tools, and AI agents to automate business processes.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }),
    }],
  }),
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
              onClick={() => { i18n.changeLanguage(l.code); try { localStorage.setItem("i18nextLng", l.code); } catch {} setOpen(false); }}
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
  const [learnOpen, setLearnOpen] = useState(false);
  const [mobileLearnOpen, setMobileLearnOpen] = useState(false);

  const otherLinks = [
    { href: "#benefits", label: t("nav.product") },
    { href: "#price", label: t("nav.pricing") },
    { href: "/book-demo", label: t("nav.bookDemo") },
  ];

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 sm:pt-4">
      <div className="glass mx-auto max-w-6xl rounded-full px-3 sm:px-5 h-14 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <VirtualSpaceLogo className="text-primary" size={28} />
            <span className="font-display font-extrabold tracking-tight text-lg text-white">Virtual Space</span>
          </div>
          <div className="flex flex-col items-start pl-2 sm:pl-3 border-l border-white/15">
            <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-white/40 leading-none">Powered by</span>
            <img
              src={vaLogoDark.url}
              alt="Virtual Accelerate"
              className="va-logo-dark h-3.5 sm:h-5 w-auto mt-0.5 rounded"
            />
            <img
              src={vaLogoLight.url}
              alt="Virtual Accelerate"
              className="va-logo-light h-3.5 sm:h-5 w-auto mt-0.5"
            />
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-5 text-sm">
          <div className="relative">
            <button
              onClick={() => setLearnOpen((o) => !o)}
              className="text-white/70 hover:text-white transition whitespace-nowrap flex items-center gap-1"
            >
              {t("nav.learn")} <ChevronDown className={`h-3 w-3 transition-transform ${learnOpen ? "rotate-180" : ""}`} />
            </button>
            {learnOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="glass-strong absolute left-0 mt-3 w-40 rounded-2xl p-2 z-50"
              >
                <span className="block rounded-xl px-3 py-2 text-sm text-white/40 cursor-default">
                  {t("nav.mentors")}
                </span>
                <span className="block rounded-xl px-3 py-2 text-sm text-white/40 cursor-default">
                  {t("nav.courses")}
                </span>
              </motion.div>
            )}
          </div>
          {otherLinks.map((link) => (
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
            <Link to="/auth" className="text-white/70 hover:text-white transition whitespace-nowrap">
              {t("nav.login")}
            </Link>
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
                  <div>
                    <button
                      onClick={() => setMobileLearnOpen((o) => !o)}
                      className="text-lg text-white/80 hover:text-white transition flex items-center gap-1"
                    >
                      {t("nav.learn")} <ChevronDown className={`h-4 w-4 transition-transform ${mobileLearnOpen ? "rotate-180" : ""}`} />
                    </button>
                    {mobileLearnOpen && (
                      <div className="flex flex-col gap-2 mt-2 ml-4">
                        <span className="text-base text-white/40 cursor-default">
                          {t("nav.mentors")}
                        </span>
                        <span className="text-base text-white/40 cursor-default">
                          {t("nav.courses")}
                        </span>
                      </div>
                    )}
                  </div>
                  {otherLinks.map((link) => (
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
                  <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-lg text-white/80 hover:text-white transition">
                    {t("nav.login")}
                  </Link>
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

function DemoForm() {
  const { t, i18n } = useTranslation();
  const submit = useServerFn(submitDemoRequest);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await submit({
        data: {
          name: name.trim(),
          contact: contact.trim(),
          company: company.trim() || undefined,
          language: i18n.language,
        },
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (closed) {
    return (
      <div className="relative mt-10 max-w-xl mx-auto text-center">
        <button
          type="button"
          onClick={() => setClosed(false)}
          className="glass inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white hover:bg-white/10 transition"
        >
          {t("cta.submit")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="relative mt-10 max-w-xl mx-auto glass rounded-2xl p-6 text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
          <Check className="h-5 w-5 text-primary" />
        </div>
        <p className="text-white font-medium">{t("cta.thanks")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative mt-10 max-w-xl mx-auto grid gap-3">
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Close"
        className="glass absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-10 h-9 w-9 sm:h-10 sm:w-10 rounded-full inline-flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition shadow-lg backdrop-blur-xl border border-white/20"
      >
        <X className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
      </button>
      <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("cta.name")}
        className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input required type="text" maxLength={200} value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t("cta.contact")}
        className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <input maxLength={200} value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t("cta.company")}
        className="glass w-full rounded-full px-5 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50" />
      {error && <p className="text-xs text-destructive text-left px-2">{error}</p>}
      <button type="submit" disabled={loading}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-6 py-4 font-semibold hover:bg-white/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)] disabled:opacity-60 disabled:cursor-not-allowed">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{t("cta.submit")} <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}


function Landing() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.language?.split("-")[0] ?? "en";
  }, [i18n.language]);

  const benefitCards = [
    { key: "money", icon: Wallet },
    { key: "time", icon: Clock },
    { key: "auto", icon: Workflow },
  ] as const;

  const audience = [
    { key: "businesses", icon: Building2, gradient: "linear-gradient(135deg, oklch(0.7 0.14 145), oklch(0.9 0.03 150))" },
    { key: "startups", icon: Rocket, gradient: "linear-gradient(135deg, oklch(0.62 0.18 155), oklch(0.75 0.15 130))" },
    { key: "ngos", icon: HeartHandshake, gradient: "linear-gradient(135deg, oklch(0.6 0.16 165), oklch(0.72 0.12 180))" },
  ] as const;

  const audienceBg: Record<string, string> = {
    businesses: heroBg.url,
    startups: startupsBg.url,
    ngos: ngosBg.url,
  };

  return (
    <div id="top" className="min-h-screen text-white overflow-hidden">
      <Header />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 sm:pt-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
            className="relative w-full overflow-hidden rounded-[28px] sm:rounded-[40px] shadow-2xl shadow-black/40"
          >
            <img
              src={heroBg.url}
              alt={t("hero.title")}
              className="w-full h-[70vh] min-h-[420px] max-h-[720px] object-cover"
            />
            {/* Overlay scrim for readability */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.15 0.02 150 / 0.55) 0%, oklch(0.12 0.02 150 / 0.35) 35%, oklch(0.10 0.02 150 / 0.85) 100%)",
              }}
              aria-hidden
            />
            <div className="absolute inset-0 flex items-end sm:items-center">
              <div className="w-full px-5 sm:px-10 md:px-16 pb-8 sm:pb-0">
                <div className="max-w-2xl">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-[1.05] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
                  >
                    {t("hero.title")}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.35 }}
                    className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
                  >
                    {t("hero.subtitle")}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.5 }}
                    className="mt-7 flex flex-col sm:flex-row items-start gap-3"
                  >
                    <a
                      href="#demo"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.6)]"
                    >
                      {t("hero.cta")} <ArrowRight className="h-4 w-4" />
                    </a>
                    <a
                      href="/book-demo"
                      className="glass w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition"
                    >
                      {t("hero.cta2")}
                    </a>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.65 }}
                    className="mt-5 text-xs sm:text-sm text-white/70 max-w-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  >
                    {t("hero.tagline")}
                  </motion.p>
                </div>
              </div>
            </div>
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
                <div className="relative w-full max-w-[480px]">
                  <div className="absolute -inset-4 rounded-[40px] opacity-30 blur-3xl"
                    style={{ background: "radial-gradient(circle, #73D94F, transparent 60%)" }} />
                  <img
                    src={aiBusinessEra.url}
                    alt={t("newEra.imageAlt")}
                    className="relative w-full rounded-3xl shadow-2xl shadow-black/20 object-cover"
                  />
                </div>
              </div>
            </div>
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
              {t("audience.title")} <span className="grad-accent">{t("audience.titleAccent")}</span>
            </h2>
          </motion.div>
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6"
          >
            {audience.map((a) => {
              const bestForRaw = t(`audience.${a.key}.bestFor`, { returnObjects: true });
              const bestFor = Array.isArray(bestForRaw) ? bestForRaw : [];
              return (
                <motion.div
                  key={a.key} variants={fadeUp}
                  className="glass-strong relative overflow-hidden rounded-3xl flex flex-col"
                >
                  {/* Card image */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={audienceBg[a.key]}
                      alt={t(`audience.${a.key}.title`)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden />
                    <a.icon className="absolute top-4 left-4 h-8 w-8 text-white drop-shadow-lg" strokeWidth={1.5} />
                  </div>
                  <div className="relative p-6 sm:p-8">
                    <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full opacity-40 blur-3xl pointer-events-none" style={{ background: a.gradient }} />


                  <div className="relative mt-6">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">{t(`audience.${a.key}.tag`)}</p>
                    <h3 className="mt-2 font-display text-3xl sm:text-4xl text-white">{t(`audience.${a.key}.title`)}</h3>
                    <p className="mt-3 text-white/70 text-sm sm:text-base leading-relaxed">{t(`audience.${a.key}.desc`)}</p>
                    <p className="mt-4 text-xs uppercase tracking-wider text-white/50">{t(`audience.${a.key}.bestForLabel`)}</p>
                    <ul className="mt-2 space-y-1.5">
                      {bestFor.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  </div>
                </motion.div>

              );
            })}
          </motion.div>
        </div>
      </section>

      <Brandbook />

      {/* PRICING TEASER */}
      <section id="pricing" className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="text-center"
          >
            <h2 className="font-display text-3xl sm:text-5xl leading-tight text-white">
              {t("pricingTeaser.title")}
            </h2>
            <p className="mt-5 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              {t("pricingTeaser.subtitle")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#price" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)]">
                {t("pricingTeaser.cta")} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#demo" className="glass w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition">
                {t("pricingTeaser.cta2")}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

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
              {t("cta.title1")} <span className="grad-accent">{t("cta.title2")}</span>
            </h2>
            <p className="relative mt-5 text-base sm:text-lg text-white/60 max-w-xl mx-auto">{t("cta.subtitle")}</p>

            <DemoForm />

            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/50">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note1")}</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note2")}</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("cta.note3")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
            className="glass-strong rounded-[32px] p-6 sm:p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: "radial-gradient(60% 60% at 50% 0%, oklch(0.72 0.18 155 / 0.5), transparent 70%)" }} />
            <h2 className="relative font-display text-3xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t("finalCta.title")}
            </h2>
            <p className="relative mt-5 text-base sm:text-lg text-white/60 max-w-xl mx-auto">
              {t("finalCta.subtitle")}
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="#demo" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:bg-primary/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)]">
                {t("finalCta.cta")} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/book-demo" className="glass w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition">
                {t("finalCta.cta2")}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* POWERED BY */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-12 text-center">
          <div className="inline-flex flex-col items-center gap-2 glass rounded-2xl px-6 py-4">
            <span className="text-xs uppercase tracking-wider text-white/50">Powered by</span>
            <img
              src={vaLogoDark.url}
              alt="Virtual Accelerate"
              className="va-logo-dark h-7 sm:h-8 w-auto rounded"
            />
            <img
              src={vaLogoLight.url}
              alt="Virtual Accelerate"
              className="va-logo-light h-7 sm:h-8 w-auto"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <VirtualSpaceLogo className="text-primary" size={22} />
                <span className="font-display font-extrabold tracking-tight text-base text-white">Virtual Space</span>
              </div>
              <p className="mt-3 text-sm text-white/50 leading-relaxed">{t("footer.tagline")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-4">{t("footer.productLabel")}</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><span className="hover:text-white transition cursor-default">{t("footer.productItems.workspace")}</span></li>
                <li><span className="hover:text-white transition cursor-default">{t("footer.productItems.aiAgents")}</span></li>
                <li><span className="hover:text-white transition cursor-default">{t("footer.productItems.automation")}</span></li>
                <li><span className="hover:text-white transition cursor-default">{t("footer.productItems.analytics")}</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-4">{t("footer.learnLabel")}</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><span className="hover:text-white transition cursor-default">{t("nav.mentors")}</span></li>
                <li><span className="hover:text-white transition cursor-default">{t("nav.courses")}</span></li>
                <li><span className="hover:text-white transition cursor-default">{t("footer.resources")}</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-4">{t("footer.companyLabel")}</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="#price" className="hover:text-white transition">{t("nav.pricing")}</a></li>
                <li><a href="/book-demo" className="hover:text-white transition">{t("nav.bookDemo")}</a></li>
                <li><span className="hover:text-white transition cursor-default">{t("footer.contact")}</span></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-4">{t("footer.accountLabel")}</p>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link to="/auth" className="hover:text-white transition">{t("nav.login")}</Link></li>
                <li><Link to="/auth" className="hover:text-white transition">{t("nav.signup")}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-white/40">
            <p>{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
