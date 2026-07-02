import { motion } from "framer-motion";
import {
  Bot, LayoutGrid, GitBranch, Settings, Users,
  BarChart3, Database, Puzzle, Cloud, Shield,
  Search, Bell, Home, ListChecks, Workflow, Sparkles,
} from "lucide-react";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

function SectionHeader({ number, label, title, accent }: { number: string; label: string; title: string; accent?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-primary">
        <span className="opacity-60">{number}.</span> {label}
      </p>
      <h2 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
        {title}{" "}
        {accent && (
          <em className="italic bg-gradient-to-r from-[oklch(0.78_0.17_155)] to-[oklch(0.98_0.01_150)] bg-clip-text text-transparent">
            {accent}
          </em>
        )}
      </h2>
    </div>
  );
}

/* 1 · ONE WORKSPACE — orbital diagram */
function OrbitDiagram() {
  const nodes = [
    { icon: Bot, label: "AI Agents", angle: -90 },
    { icon: ListChecks, label: "Tasks", angle: -18 },
    { icon: BarChart3, label: "Data", angle: 54 },
    { icon: LayoutGrid, label: "Tools", angle: 126 },
    { icon: Users, label: "Team", angle: 198 },
  ];
  return (
    <div className="relative aspect-square w-full max-w-[520px] mx-auto">
      {/* orbit rings */}
      <div className="absolute inset-0 rounded-full border border-primary/25" />
      <div className="absolute inset-[10%] rounded-full border border-primary/15" />
      <div className="absolute inset-[22%] rounded-full border border-primary/10" />

      {/* center mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass-strong rounded-full h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center">
          <VirtualSpaceLogo className="text-primary" size={72} />
        </div>
      </div>

      {/* nodes */}
      {nodes.map(({ icon: Icon, label, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        const r = 46; // %
        const x = 50 + Math.cos(rad) * r;
        const y = 50 + Math.sin(rad) * r;
        return (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="glass rounded-full h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" strokeWidth={1.75} />
            </div>
            <p className="mt-2 text-center text-[11px] sm:text-xs text-white/70 font-medium">
              {label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function OneWorkspace() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <SectionHeader number="01" label="Architecture" title="One workspace." accent="Everything connected." />
            <p className="mt-6 text-white/60 leading-relaxed max-w-md">
              Virtual Space is an AI-agentic workspace that connects teams, tools, workflows,
              and intelligent agents in one business operating space.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/75">
              {["AI Agents at the core", "Team, Tasks, Tools & Data in orbit", "One connected operating layer"].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {x}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <OrbitDiagram />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* 2 · COLOR PALETTE */
function ColorPalette() {
  const primary = [
    { name: "Virtual Green", hex: "#73D94F", bg: "#73D94F", ink: "#101820" },
    { name: "Workspace Black", hex: "#101820", bg: "#101820", ink: "#F7F9F5" },
    { name: "Signal Green", hex: "#B8F28A", bg: "#B8F28A", ink: "#101820" },
  ];
  const neutral = [
    { name: "Cloud White", hex: "#F7F9F5", bg: "#F7F9F5", ink: "#101820" },
    { name: "System Gray", hex: "#687280", bg: "#687280", ink: "#F7F9F5" },
    { name: "Soft Gray", hex: "#E5E7E8", bg: "#E5E7E8", ink: "#101820" },
  ];
  const gradients = [
    { name: "Main Gradient", css: "linear-gradient(135deg, #73D94F, #B8F28A)", ink: "#101820", label: "#73D94F → #B8F28A" },
    { name: "Dark Premium", css: "linear-gradient(135deg, #101820, #1A2S2F)".replace("1A2S2F","1A2A2F"), ink: "#F7F9F5", label: "#101820 → #1A2A2F" },
  ];

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="02" label="Color Palette" title="Green energy." accent="Grounded ink." />

        <div className="mt-12 grid gap-4 sm:gap-6">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50 mb-3">Primary</p>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              {primary.map((c) => (
                <div key={c.name} className="rounded-2xl p-5 h-32 flex flex-col justify-between" style={{ background: c.bg, color: c.ink }}>
                  <span className="text-xs font-mono opacity-70">{c.hex}</span>
                  <span className="font-semibold">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50 mb-3 mt-4">Neutral</p>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              {neutral.map((c) => (
                <div key={c.name} className="rounded-2xl p-5 h-32 flex flex-col justify-between border border-white/10" style={{ background: c.bg, color: c.ink }}>
                  <span className="text-xs font-mono opacity-70">{c.hex}</span>
                  <span className="font-semibold">{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50 mb-3 mt-4">Gradients</p>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {gradients.map((g) => (
                <div key={g.name} className="rounded-2xl p-5 h-32 flex flex-col justify-between" style={{ background: g.css, color: g.ink }}>
                  <span className="text-xs font-mono opacity-80">{g.label}</span>
                  <span className="font-semibold">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 3 · TYPOGRAPHY */
function Typography() {
  const scale = [
    { name: "H1", spec: "Manrope ExtraBold · 54/64", weight: 800, size: "54px", sample: "Intelligent workspace." },
    { name: "H2", spec: "Manrope Bold · 36/44", weight: 700, size: "36px", sample: "Real business impact." },
    { name: "H3", spec: "Manrope Bold · 28/36", weight: 700, size: "28px", sample: "Automate the routine." },
    { name: "H4", spec: "Manrope SemiBold · 20/28", weight: 600, size: "20px", sample: "Work faster with agents." },
    { name: "Body", spec: "Manrope Regular · 16/24", weight: 400, size: "16px", sample: "Virtual Space helps teams automate routines, connect everything, and move faster." },
    { name: "Small", spec: "Manrope Regular · 14/20", weight: 400, size: "14px", sample: "One connected space where business, people, and AI agents work together." },
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="03" label="Typography" title="Manrope" accent="—one voice." />
        <div className="mt-12 grid md:grid-cols-[280px_1fr] gap-8 sm:gap-12">
          <div className="glass-strong rounded-3xl p-8 flex flex-col justify-between min-h-[260px]">
            <div className="font-display text-[140px] leading-none font-extrabold text-white">Aa</div>
            <div>
              <p className="text-white font-bold">Manrope</p>
              <p className="text-xs text-white/50 mt-1">Recommended · 400–800</p>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {scale.map((s) => (
              <div key={s.name} className="py-4 grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr_260px] gap-4 items-baseline">
                <span className="text-xs font-mono text-primary">{s.name}</span>
                <span
                  className="text-white truncate"
                  style={{ fontWeight: s.weight, fontSize: `clamp(14px, ${s.size}, ${s.size})`, lineHeight: 1.15 }}
                >
                  {s.sample}
                </span>
                <span className="hidden sm:block text-right text-xs text-white/50 font-mono">{s.spec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* 4 · ICONOGRAPHY */
function Iconography() {
  const icons = [
    { Icon: Bot, label: "AI Agent" },
    { Icon: LayoutGrid, label: "Workspace" },
    { Icon: GitBranch, label: "Workflow" },
    { Icon: Settings, label: "Automation" },
    { Icon: Users, label: "Team" },
    { Icon: BarChart3, label: "Analytics" },
    { Icon: Database, label: "Data" },
    { Icon: Puzzle, label: "Integrations" },
    { Icon: Cloud, label: "Cloud" },
    { Icon: Shield, label: "Security" },
  ];
  const style = ["Line based", "Rounded corners", "Consistent stroke", "Green accent", "Simple & clear"];
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="04" label="Iconography" title="One line." accent="One system." />
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          {icons.map(({ Icon, label }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-3 aspect-square"
            >
              <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
              <span className="text-xs text-white/70">{label}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 glass rounded-2xl p-5 sm:p-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/70">
          <span className="text-primary font-mono uppercase tracking-[0.2em] mr-2">Icon Style</span>
          {style.map((s) => <span key={s}>· {s}</span>)}
        </div>
      </div>
    </section>
  );
}

/* 5 · UI DIRECTION */
function UIDirection() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="05" label="UI Direction" title="Command center" accent="for operators." />
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="mt-12 glass-strong rounded-3xl overflow-hidden grid md:grid-cols-[220px_1fr]"
        >
          {/* sidebar */}
          <div className="bg-black/40 border-r border-white/10 p-5 hidden md:flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-6">
              <VirtualSpaceLogo className="text-primary" size={22} />
              <span className="font-display font-extrabold text-white">Virtual Space</span>
            </div>
            {[
              { Icon: Home, label: "Home", active: true },
              { Icon: ListChecks, label: "Tasks" },
              { Icon: Bot, label: "AI Agents" },
              { Icon: LayoutGrid, label: "Workspace" },
              { Icon: BarChart3, label: "Analytics" },
              { Icon: Puzzle, label: "Integrations" },
              { Icon: Settings, label: "Settings" },
            ].map(({ Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${
                  active ? "bg-primary/15 text-primary" : "text-white/60 hover:bg-white/5"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} /> {label}
              </div>
            ))}
          </div>
          {/* content */}
          <div className="p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-extrabold text-2xl text-white">Good morning, Alex ✱</p>
                <p className="text-sm text-white/50">Here's what's happening in your workspace.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="glass rounded-full px-3 py-2 flex items-center gap-2 text-xs text-white/60">
                  <Search className="h-3.5 w-3.5" /> Search…
                </div>
                <div className="glass rounded-full h-9 w-9 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white/70" />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: "Tasks", val: "24", sub: "in progress" },
                { label: "AI Agents", val: "8", sub: "active" },
                { label: "Workflows", val: "12", sub: "running" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">{s.label}</p>
                  <p className="mt-2 font-display font-extrabold text-3xl text-white">{s.val}</p>
                  <p className="text-xs text-white/50">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3 sm:gap-4">
              <div className="glass rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Recent Activity</p>
                <ul className="mt-3 space-y-3 text-sm text-white/80">
                  <li>· AI Agent "Market Analyst" completed a report</li>
                  <li>· New task "Q2 Strategy" assigned to you</li>
                  <li>· Workflow "Lead Generation" completed</li>
                </ul>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">AI Agents</p>
                <ul className="mt-3 space-y-2 text-sm">
                  {["Market Analyst", "Content Writer", "Customer Support"].map((a) => (
                    <li key={a} className="flex items-center justify-between text-white/80">
                      <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> {a}</span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-primary">Active</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* 6 · TONE OF VOICE + KEYWORDS + TAGLINES */
function VoiceKeywords() {
  const tone = [
    { title: "Clear over complex", body: "We explain things simply." },
    { title: "Business-first", body: "We focus on real outcomes." },
    { title: "Calm confidence", body: "We're reliable and professional." },
    { title: "Smart but human", body: "AI empowers, people lead." },
  ];
  const taglines = [
    "AI-agentic workspace for business",
    "Where teams and AI agents work together",
    "One space for people, processes, and AI",
    "Your connected workspace for business operations",
    "Run your business with AI agents in one workspace",
  ];
  const keywords = [
    "Connected", "Agentic", "Workspace", "Automation",
    "Intelligence", "Flow", "Collaboration", "Clarity",
    "Control", "Impact",
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid md:grid-cols-2 gap-10">
        <div>
          <SectionHeader number="06" label="Tone of Voice" title="Smart," accent="but human." />
          <div className="mt-10 grid sm:grid-cols-2 gap-3 sm:gap-4">
            {tone.map((t) => (
              <div key={t.title} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <p className="font-semibold text-white">{t.title}</p>
                </div>
                <p className="mt-2 text-sm text-white/60">{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader number="07" label="Taglines & Keywords" title="How we" accent="speak." />
          <div className="mt-10 glass rounded-2xl p-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50">Tagline Options</p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              {taglines.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 glass rounded-2xl p-6">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50">Keywords</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((k) => (
                <span key={k} className="px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/25">
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* 8 · APPLICATIONS */
function Applications() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="08" label="Brand Applications" title="One system," accent="many surfaces." />
        <div className="mt-12 grid md:grid-cols-3 gap-4 sm:gap-6">
          {/* Website hero */}
          <div className="md:col-span-2 glass-strong rounded-3xl p-8 relative overflow-hidden min-h-[280px] flex flex-col justify-between">
            <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ background: "radial-gradient(circle, #73D94F 0%, transparent 70%)" }} />
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50">Website Hero</p>
            <div className="relative">
              <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
                One workspace for your team, tools, and AI agents.
              </h3>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full px-4 py-2 text-xs font-semibold bg-primary text-[#101820]">Get Started</span>
                <span className="rounded-full px-4 py-2 text-xs font-semibold glass text-white">Watch Demo</span>
              </div>
            </div>
          </div>

          {/* App Icon */}
          <div className="glass-strong rounded-3xl p-6 flex flex-col justify-between min-h-[280px]">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50">App Icon</p>
            <div className="flex items-center justify-center flex-1">
              <div className="rounded-3xl bg-[#101820] border border-white/10 h-28 w-28 flex items-center justify-center shadow-2xl">
                <VirtualSpaceLogo className="text-primary" size={64} />
              </div>
            </div>
          </div>

          {/* Presentation slide */}
          <div className="md:col-span-3 glass-strong rounded-3xl p-8 relative overflow-hidden">
            <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-white/50">Presentation Slide</p>
            <div className="mt-4 grid md:grid-cols-2 items-center gap-6">
              <h3 className="font-display font-extrabold text-4xl sm:text-5xl text-white leading-[1.05]">
                AI-agentic <span className="text-primary">workspace</span><br />for business
              </h3>
              <div className="flex items-center justify-center">
                <VirtualSpaceLogo className="text-primary opacity-90" size={140} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Brandbook() {
  return (
    <div id="brandbook">
      <OneWorkspace />
      <ColorPalette />
      <Typography />
      <Iconography />
      <UIDirection />
      <VoiceKeywords />
      <Applications />
    </div>
  );
}
