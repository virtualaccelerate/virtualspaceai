import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

type Lang = "en" | "ru" | "es" | "de" | "fr";

const COPY: Record<Lang, {
  title: string;
  subtitle: string;
  headerLeft: string;
  headerRight: string;
  deptLabel: string;
  workloadsLabel: string;
  statusOptimized: string;
  departments: string[];
}> = {
  en: {
    title: "Dynamic Agent Tasks",
    subtitle: "Watch how Virtual Space intelligently routes tasks across your departments.",
    headerLeft: "AGENT CONTROL CENTER",
    headerRight: "STATUS: SYSTEM OPTIMIZED",
    deptLabel: "DEPARTMENT",
    workloadsLabel: "ACTIVE AI WORKLOADS",
    statusOptimized: "SYSTEM OPTIMIZED",
    departments: ["Data", "Sales", "Analytics", "Operations"],
  },
  ru: {
    title: "Динамические задачи агентов",
    subtitle: "Смотрите, как Virtual Space маршрутизирует задачи между отделами.",
    headerLeft: "ЦЕНТР УПРАВЛЕНИЯ АГЕНТАМИ",
    headerRight: "СТАТУС: СИСТЕМА ОПТИМИЗИРОВАНА",
    deptLabel: "ОТДЕЛ",
    workloadsLabel: "АКТИВНЫЕ AI-НАГРУЗКИ",
    statusOptimized: "СИСТЕМА ОПТИМИЗИРОВАНА",
    departments: ["Данные", "Продажи", "Аналитика", "Операции"],
  },
  es: {
    title: "Tareas dinámicas de agentes",
    subtitle: "Mira cómo Virtual Space enruta tareas entre departamentos.",
    headerLeft: "CENTRO DE CONTROL DE AGENTES",
    headerRight: "ESTADO: SISTEMA OPTIMIZADO",
    deptLabel: "DEPARTAMENTO",
    workloadsLabel: "CARGAS DE IA ACTIVAS",
    statusOptimized: "SISTEMA OPTIMIZADO",
    departments: ["Datos", "Ventas", "Analítica", "Operaciones"],
  },
  de: {
    title: "Dynamische Agenten-Aufgaben",
    subtitle: "Sehen Sie, wie Virtual Space Aufgaben intelligent routed.",
    headerLeft: "AGENTEN-KONTROLLZENTRUM",
    headerRight: "STATUS: SYSTEM OPTIMIERT",
    deptLabel: "ABTEILUNG",
    workloadsLabel: "AKTIVE KI-WORKLOADS",
    statusOptimized: "SYSTEM OPTIMIERT",
    departments: ["Daten", "Vertrieb", "Analytik", "Betrieb"],
  },
  fr: {
    title: "Tâches dynamiques des agents",
    subtitle: "Regardez comment Virtual Space route les tâches entre départements.",
    headerLeft: "CENTRE DE CONTRÔLE DES AGENTS",
    headerRight: "STATUT : SYSTÈME OPTIMISÉ",
    deptLabel: "DÉPARTEMENT",
    workloadsLabel: "CHARGES IA ACTIVES",
    statusOptimized: "SYSTÈME OPTIMISÉ",
    departments: ["Données", "Ventes", "Analyse", "Opérations"],
  },
};

const TASKS: { label: string; active: boolean }[][] = [
  // Data
  [
    { label: "Cleaning Logs", active: false },
    { label: "ETL Flow", active: false },
    { label: "Validation", active: false },
    { label: "Encryption", active: true },
    { label: "Backup", active: false },
  ],
  // Sales
  [
    { label: "Lead Scoring", active: false },
    { label: "Outreach", active: true },
    { label: "Follow-up", active: false },
    { label: "Meeting Set", active: false },
    { label: "Closing Docs", active: false },
  ],
  // Analytics
  [
    { label: "KPI Tracking", active: false },
    { label: "Insight Gen", active: false },
    { label: "Forecasting", active: false },
    { label: "Audit", active: true },
    { label: "Visualizer", active: false },
  ],
  // Operations
  [
    { label: "Inventory", active: true },
    { label: "Logistics", active: false },
    { label: "Procurement", active: true },
    { label: "Compliance", active: false },
    { label: "Dispatch", active: false },
  ],
];

export function AnimatedTaskTable() {
  const { i18n } = useTranslation();
  const langCode = (i18n.language?.split("-")[0] ?? "en") as Lang;
  const copy = COPY[langCode] ?? COPY.en;

  return (
    <section id="tasks" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-5xl text-white leading-tight">
            {copy.title}
          </h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            {copy.subtitle}
          </p>
        </motion.div>

        {/* Terminal window */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl overflow-hidden border border-white/10 bg-[#0B0F14] shadow-2xl"
        >
          {/* macOS-style header bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#0f1419] border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
              <span className="hidden sm:inline-block ml-4 text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
                {copy.headerLeft}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#73D94F] font-mono font-semibold">
              {copy.headerRight}
            </span>
          </div>

          {/* Table body */}
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Column labels */}
              <div className="grid grid-cols-[120px_1fr] gap-4 pb-3 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
                  {copy.deptLabel}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
                  {copy.workloadsLabel}
                </span>
              </div>

              {/* Rows */}
              <div className="mt-2 space-y-2">
                {copy.departments.map((dept, deptIdx) => (
                  <motion.div
                    key={dept}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-30px" }}
                    transition={{
                      delay: deptIdx * 0.1,
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="grid grid-cols-[120px_1fr] gap-4 items-center py-2"
                  >
                    <span className="text-sm font-semibold text-white/90">
                      {dept}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {TASKS[deptIdx]?.map((task, taskIdx) => (
                        <motion.span
                          key={task.label}
                          initial={{ opacity: 0, scale: 0.85 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            delay: deptIdx * 0.1 + taskIdx * 0.05 + 0.15,
                            duration: 0.4,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className={
                            task.active
                              ? "inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium bg-[#73D94F] text-[#0B0F14] shadow-[0_0_12px_rgba(115,217,79,0.35)]"
                              : "inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium bg-white/[0.06] text-white/70 border border-white/10 hover:bg-white/[0.10] hover:text-white transition"
                          }
                        >
                          {task.label}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
