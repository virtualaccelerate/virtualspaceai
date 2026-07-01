import { createFileRoute } from "@tanstack/react-router";
import {
  Search, Bot, Zap, Clock, PiggyBank, Workflow, Rocket, Building2,
  HeartHandshake, Sparkles, MessageSquare, Calendar, BarChart3, Mail,
  ShieldCheck, ArrowRight, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.7_0.2_300)] via-[oklch(0.65_0.22_20)] to-[oklch(0.75_0.18_60)]" />
          <span className="font-display text-2xl">Agentix</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#learn" className="text-muted-foreground hover:text-foreground">Learn</a>
          <a href="#price" className="text-muted-foreground hover:text-foreground">Price</a>
        </nav>
        <a
          href="#demo"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Get Demo <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}

type Tile = {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  featured?: "warm" | "cool" | "mint";
  title?: string;
  desc?: string;
};

function TileGrid({ items }: { items: Tile[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 border-t border-l border-border/70">
      {items.map((t, i) => {
        if (t.featured) {
          const bg =
            t.featured === "warm" ? "bg-tile-warm" :
            t.featured === "cool" ? "bg-tile-cool" : "bg-tile-mint";
          return (
            <div
              key={i}
              className={`${bg} col-span-2 row-span-2 border-r border-b border-border/70 p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden`}
            >
              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <div className="h-8 w-40 rounded-md bg-white/70 shadow-sm" />
                  <div className="h-8 w-16 rounded-md bg-white/50" />
                </div>
                <div className="h-2 w-3/4 rounded bg-white/60" />
                <div className="h-2 w-1/2 rounded bg-white/50" />
                <div className="h-2 w-2/3 rounded bg-white/40" />
              </div>
              <div className="flex items-center gap-3">
                {t.icon ? <t.icon className="h-8 w-8" /> : null}
                <span className="font-display text-3xl">{t.title}</span>
              </div>
            </div>
          );
        }
        const Icon = t.icon!;
        return (
          <div
            key={i}
            className="border-r border-b border-border/70 aspect-square flex flex-col items-center justify-center gap-3 p-4 hover:bg-secondary/60 transition"
          >
            <Icon className="h-7 w-7 text-foreground/80" strokeWidth={1.5} />
            <span className="text-sm text-center text-foreground/80 leading-tight">{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Landing() {
  const tiles: Tile[] = [
    { icon: Search, label: "Smart Search" },
    { icon: Bot, label: "AI Agents" },
    { icon: MessageSquare, label: "Chat Ops" },
    { icon: Calendar, label: "Scheduling" },
    { icon: Mail, label: "Email Bot" },
    { icon: BarChart3, label: "Analytics" },

    { icon: Sparkles, label: "Reporting" },
    { icon: Workflow, label: "Workflows" },
    { featured: "warm", title: "Automations", icon: Zap },
    { featured: "cool", title: "Agents", icon: Bot },
    { icon: ShieldCheck, label: "Guardrails" },
    { icon: Clock, label: "24/7 Uptime" },

    { icon: PiggyBank, label: "Cost Cuts" },
    { icon: Rocket, label: "Fast Deploy" },
    { icon: Building2, label: "CRM Sync" },
    { icon: HeartHandshake, label: "Support" },
  ];

  return (
    <div id="top" className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, oklch(0.9 0.08 60 / 0.5), transparent), radial-gradient(50% 40% at 80% 20%, oklch(0.9 0.08 300 / 0.5), transparent), radial-gradient(60% 50% at 50% 90%, oklch(0.9 0.08 160 / 0.4), transparent)"
          }}
        />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> AI Agentic Workspace
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl lg:text-8xl leading-[1.02]">
            A <em className="italic text-[oklch(0.55_0.2_300)]">new era</em> for business
            <br /> with AI agents.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            One workspace where autonomous agents handle operations, sales and support —
            around the clock, without burning out.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="#demo" className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90">
              Get a demo <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#learn" className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-6 py-3 text-sm font-medium hover:bg-accent">
              Learn more
            </a>
          </div>
        </div>

        {/* Tile grid */}
        <div id="learn" className="mx-auto max-w-7xl px-6 pb-24">
          <TileGrid items={tiles} />
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Why teams switch</p>
            <h2 className="mt-3 font-display text-4xl md:text-6xl leading-tight">
              Save money. Save time. <em className="italic text-[oklch(0.55_0.2_300)]">Ship faster.</em>
            </h2>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { icon: PiggyBank, title: "Save money", desc: "Replace repetitive human hours with agents that cost cents to run — cut operating costs up to 70%." },
              { icon: Clock, title: "Save time · 24/7", desc: "Agents work while you sleep. No shifts, no breaks — customers get answers in seconds, always." },
              { icon: Workflow, title: "Automations", desc: "Compose multi-step workflows across your tools with no code. Trigger, decide, act, report." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl bg-background border border-border p-8 hover:shadow-lg transition">
                <c.icon className="h-8 w-8 text-[oklch(0.55_0.2_300)]" strokeWidth={1.5} />
                <h3 className="mt-6 text-2xl">{c.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section id="price" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Who it's for</p>
            <h2 className="mt-3 font-display text-4xl md:text-6xl leading-tight">
              Built for teams that <em className="italic text-[oklch(0.55_0.2_300)]">move</em>.
            </h2>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Rocket,
                tag: "Startups",
                title: "Стартапам",
                desc: "Do the work of a 20-person team from day one. Ship product, not process.",
                bg: "bg-tile-cool",
              },
              {
                icon: Building2,
                tag: "Entrepreneurs",
                title: "Предпринимателям",
                desc: "Run sales, support and ops solo. Agents handle the repeatable, you handle the vision.",
                bg: "bg-tile-warm",
              },
              {
                icon: HeartHandshake,
                tag: "NGOs · НПО",
                title: "НПО",
                desc: "Amplify impact with limited resources. Automate donor comms, reporting and outreach.",
                bg: "bg-tile-mint",
              },
            ].map((c) => (
              <div key={c.tag} className={`${c.bg} rounded-3xl p-8 border border-border/60 flex flex-col min-h-[320px]`}>
                <c.icon className="h-8 w-8" strokeWidth={1.5} />
                <div className="mt-auto">
                  <p className="text-xs uppercase tracking-widest text-foreground/60">{c.tag}</p>
                  <h3 className="mt-2 font-display text-4xl">{c.title}</h3>
                  <p className="mt-3 text-foreground/70">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h2 className="font-display text-5xl md:text-7xl leading-[1.05]">
            Оставьте заявку <em className="italic text-[oklch(0.85_0.15_60)]">на демо</em>
          </h2>
          <p className="mt-5 text-lg text-primary-foreground/70 max-w-xl mx-auto">
            30 минут — покажем, как агенты закроют 3 самые дорогие задачи вашего бизнеса.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); alert("Спасибо! Мы свяжемся в течение 24 часов."); }}
            className="mt-10 max-w-xl mx-auto grid gap-3"
          >
            <input required placeholder="Ваше имя"
              className="w-full rounded-full bg-white/10 border border-white/15 px-5 py-4 placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />
            <input required type="email" placeholder="Email или Telegram"
              className="w-full rounded-full bg-white/10 border border-white/15 px-5 py-4 placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />
            <input placeholder="Компания (необязательно)"
              className="w-full rounded-full bg-white/10 border border-white/15 px-5 py-4 placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40" />
            <button type="submit"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white text-primary px-6 py-4 font-medium hover:bg-white/90">
              Запросить демо <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/60">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Без карты</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Ответ за 24 часа</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> NDA по запросу</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[oklch(0.7_0.2_300)] to-[oklch(0.75_0.18_60)]" />
            <span className="font-display text-lg text-foreground">Agentix</span>
          </div>
          <p>© {new Date().getFullYear()} Agentix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
