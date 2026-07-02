import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Bot, LayoutGrid, Users, BarChart3, ListChecks } from "lucide-react";
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
        {accent && <span className="grad-accent">{accent}</span>}
      </h2>
    </div>
  );
}

/* 01 · ONE WORKSPACE — orbital diagram */
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
      <div className="absolute inset-0 rounded-full border border-primary/25" />
      <div className="absolute inset-[10%] rounded-full border border-primary/15" />
      <div className="absolute inset-[22%] rounded-full border border-primary/10" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="glass-strong rounded-full h-28 w-28 sm:h-36 sm:w-36 flex items-center justify-center">
          <VirtualSpaceLogo className="text-primary" size={72} />
        </div>
      </div>

      {nodes.map(({ icon: Icon, label, angle }, i) => {
        const rad = (angle * Math.PI) / 180;
        const r = 46;
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
              Teams, tools, workflows and AI agents in one operating space.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/75">
              {["AI Agents at the core", "Team, Tasks, Tools & Data in orbit", "One connected layer"].map((x) => (
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

/* 02 · TONE OF VOICE */
function VoiceKeywords() {
  const tone = [
    { title: "Clear over complex", body: "We explain things simply." },
    { title: "Business-first", body: "We focus on real outcomes." },
    { title: "Calm confidence", body: "Reliable and professional." },
    { title: "Smart but human", body: "AI empowers, people lead." },
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <SectionHeader number="" label="" title="Smart," accent="but human." />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
    </section>
  );
}

export function Brandbook() {
  return (
    <div id="brandbook">
      <OneWorkspace />
      <VoiceKeywords />
    </div>
  );
}
