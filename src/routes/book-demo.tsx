import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Check, Globe, Sun, Moon, ArrowRight } from "lucide-react";
import "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";

export const Route = createFileRoute("/book-demo")({
  component: BookDemoPage,
  head: () => ({
    meta: [
      { title: "Book a Demo — Virtual Space" },
      { name: "description", content: "See how Virtual Space fits your workflows and helps your team work faster with AI." },
    ],
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
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
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
  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3 sm:pt-4">
      <div className="glass mx-auto max-w-6xl rounded-full px-3 sm:px-5 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <VirtualSpaceLogo className="text-primary" size={28} />
          <span className="font-display font-extrabold tracking-tight text-lg text-white">Virtual Space</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LangSwitcher />
        </div>
      </div>
    </header>
  );
}

function BookDemoPage() {
  const { t } = useTranslation();

  const items = t("bookDemoPage.items", { returnObjects: true }) as Array<{ title: string; body: string }>;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero + Demo Block */}
      <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-20">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t("bookDemoPage.title")}
            </h1>
            <p className="mt-6 text-white/60 leading-relaxed max-w-xl mx-auto">
              {t("bookDemoPage.subtitle")}
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-10 glass-strong rounded-3xl p-6 sm:p-10 text-left"
          >
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-10">
              {/* Left: What's in the Demo */}
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white mb-6">{t("bookDemoPage.sectionTitle")}</h2>
                <div className="space-y-4">
                  {items.map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{item.body}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Form */}
              <div>
                <h2 className="font-display text-xl sm:text-2xl text-white mb-6">{t("cta.title1")} {t("cta.title2")}</h2>
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-2xl p-6 text-center"
                  >
                    <div className="mx-auto h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-white font-medium">{t("cta.thanks")}</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">{t("cta.name")}</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t("cta.name")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">{t("cta.contact")}</label>
                      <input
                        type="text"
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t("cta.contact")}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-1.5">{t("cta.company")}</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder={t("cta.company")}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition shadow-[0_10px_40px_-10px_oklch(0.75_0.18_155_/_0.5)]"
                    >
                      {t("cta.submit")} <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <span className="text-[11px] text-white/40">{t("cta.note1")}</span>
                      <span className="text-[11px] text-white/40">{t("cta.note2")}</span>
                      <span className="text-[11px] text-white/40">{t("cta.note3")}</span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
