import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Lang = "en" | "ru" | "kk" | "ky" | "uz" | "tg";

const COPY: Record<Lang, {
  title: string;
  subtitle: string;
  headerLeft: string;
  headerRight: string;
  deptLabel: string;
  workloadsLabel: string;
  departments: string[];
}> = {
  en: {
    title: "Dynamic Agent Tasks",
    subtitle: "Watch how Virtual Space intelligently routes tasks across your departments.",
    headerLeft: "AGENT CONTROL CENTER",
    headerRight: "STATUS: SYSTEM OPTIMIZED",
    deptLabel: "DEPARTMENT",
    workloadsLabel: "ACTIVE AI WORKLOADS",
    departments: ["Data", "Sales", "Analytics", "Operations"],
  },
  ru: {
    title: "Динамические задачи агентов",
    subtitle: "Смотрите, как Virtual Space маршрутизирует задачи между отделами.",
    headerLeft: "ЦЕНТР УПРАВЛЕНИЯ АГЕНТАМИ",
    headerRight: "СТАТУС: СИСТЕМА ОПТИМИЗИРОВАНА",
    deptLabel: "ОТДЕЛ",
    workloadsLabel: "АКТИВНЫЕ AI-НАГРУЗКИ",
    departments: ["Данные", "Продажи", "Аналитика", "Операции"],
  },
  kk: {
    title: "Агенттердің динамикалық тапсырмалары",
    subtitle: "Virtual Space тапсырмаларды бөлімдер арасында қалай бағыттайтынын көріңіз.",
    headerLeft: "АГЕНТТЕРДІ БАСҚАРУ ОРТАЛЫҒЫ",
    headerRight: "МӘРТЕБЕ: ЖҮЙЕ ОҢТАЙЛАНДЫРЫЛҒАН",
    deptLabel: "БӨЛІМ",
    workloadsLabel: "БЕЛСЕНДІ AI-ЖҮКТЕМЕЛЕР",
    departments: ["Деректер", "Сатылым", "Аналитика", "Операциялар"],
  },
  ky: {
    title: "Агенттердин динамикалык тапшырмалары",
    subtitle: "Virtual Space тапшырмаларды бөлүмдөр арасында кантип багыттарын көрүңүз.",
    headerLeft: "АГЕНТТЕРДИ БАШКАРУУ БОРБОРУ",
    headerRight: "АБАЛ: СИСТЕМА ОҢТОЙЛОШТУРУЛГАН",
    deptLabel: "БӨЛҮМ",
    workloadsLabel: "АКТИВДҮҮ AI-ЖҮКТӨӨЛӨР",
    departments: ["Маалыматтар", "Сатуу", "Аналитика", "Операциялар"],
  },
  uz: {
    title: "Agentlarning dinamik vazifalari",
    subtitle: "Virtual Space vazifalarni boʻlimlar oʻrtasida qanday yoʻnaltirishini kuzating.",
    headerLeft: "AGENTLARNI BOSHQARISH MARKAZI",
    headerRight: "HOLAT: TIZIM OPTIMALLASHTIRILDI",
    deptLabel: "BOʻLIM",
    workloadsLabel: "FAOL AI-YUKLAMALAR",
    departments: ["Maʼlumot", "Sotuv", "Analitika", "Operatsiyalar"],
  },
  tg: {
    title: "Вазифаҳои динамикии агентҳо",
    subtitle: "Бинед, ки Virtual Space вазифаҳоро дар байни шӯъбаҳо чӣ гуна тақсим мекунад.",
    headerLeft: "МАРКАЗИ ИДОРАКУНИИ АГЕНТҲО",
    headerRight: "ҲОЛАТ: СИСТЕМА БЕҲИНА",
    deptLabel: "ШӮЪБА",
    workloadsLabel: "БОРҲОИ ФАЪОЛИ AI",
    departments: ["Маълумот", "Фурӯш", "Аналитика", "Амалиёт"],
  },
};


const FALLBACK_TASKS: string[][] = [
  ["Cleaning Logs", "ETL Flow", "Validation", "Encryption", "Backup"],
  ["Lead Scoring", "Outreach", "Follow-up", "Meeting Set", "Closing Docs"],
  ["KPI Tracking", "Insight Gen", "Forecasting", "Audit", "Visualizer"],
  ["Inventory", "Logistics", "Procurement", "Compliance", "Dispatch"],
];

export function AnimatedTaskTable() {
  const { t, i18n } = useTranslation();
  const langCode = (i18n.language?.split("-")[0] ?? "en") as Lang;
  const copy = COPY[langCode] ?? COPY.en;

  const tasks = useMemo<string[][]>(() => {
    const raw = t("taskTable.tasks", { returnObjects: true });
    return Array.isArray(raw) ? (raw as string[][]) : FALLBACK_TASKS;
  }, [t, i18n.language]);

  // Random active tasks that cycle
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const pickRandom = () => {
      const next = new Set<string>();
      // pick 1-2 active per department
      tasks.forEach((row, dIdx) => {
        const count = 1 + Math.floor(Math.random() * 2);
        const indices = new Set<number>();
        while (indices.size < count) {
          indices.add(Math.floor(Math.random() * row.length));
        }
        indices.forEach((tIdx) => next.add(`${dIdx}-${tIdx}`));
      });
      setActiveKeys(next);
    };
    pickRandom();
    const id = setInterval(pickRandom, 1400);
    return () => clearInterval(id);
  }, [tasks]);

  return (
    <section id="tasks" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="font-display text-3xl sm:text-5xl text-[color:var(--foreground)] leading-tight">
            {copy.title}
          </h2>
          <p className="mt-3 text-[color:var(--muted-foreground)] text-sm sm:text-base max-w-xl mx-auto px-2">
            {copy.subtitle}
          </p>
        </motion.div>

        {/* Terminal window - adapts to theme */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl sm:rounded-3xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl"
        >
          {/* macOS-style header bar */}
          <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-[color:color-mix(in_oklab,var(--card)_92%,black_8%)] border-b border-[color:var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FF5F57] shrink-0" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#FFBD2E] shrink-0" />
              <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-[#28C840] shrink-0" />
              <span className="hidden sm:inline-block ml-4 text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)] font-mono truncate">
                {copy.headerLeft}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[#73D94F] font-mono font-semibold shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#73D94F] animate-pulse" />
              <span className="hidden xs:inline sm:inline">{copy.headerRight}</span>
              <span className="xs:hidden sm:hidden">LIVE</span>
            </span>
          </div>

          {/* Table body */}
          <div className="p-3 sm:p-6">
            {/* Column labels — desktop only */}
            <div className="hidden sm:grid grid-cols-[140px_1fr] gap-4 pb-3 border-b border-[color:var(--border)]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)] font-mono">
                {copy.deptLabel}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted-foreground)] font-mono">
                {copy.workloadsLabel}
              </span>
            </div>

            {/* Rows */}
            <div className="mt-2 space-y-3 sm:space-y-2">
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
                  className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-4 sm:items-center py-2 border-b border-[color:var(--border)]/60 sm:border-0 last:border-0"
                >
                  <span className="text-xs sm:text-sm font-semibold text-[color:var(--foreground)] uppercase tracking-wider sm:tracking-normal sm:normal-case">
                    {dept}
                  </span>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {tasks[deptIdx]?.map((label, taskIdx) => {
                      const key = `${deptIdx}-${taskIdx}`;
                      const isActive = activeKeys.has(key);
                      return (
                        <motion.span
                          key={label}
                          initial={{ opacity: 0, scale: 0.85 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            delay: deptIdx * 0.08 + taskIdx * 0.04 + 0.15,
                            duration: 0.4,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          animate={
                            isActive
                              ? {
                                  backgroundColor: "#73D94F",
                                  color: "#0B0F14",
                                  boxShadow: "0 0 18px rgba(115,217,79,0.55)",
                                  scale: [1, 1.05, 1],
                                }
                              : {
                                  backgroundColor: "rgba(127,127,127,0.08)",
                                  color: "var(--muted-foreground)",
                                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                                  scale: 1,
                                }
                          }
                          style={{
                            transition:
                              "background-color 0.6s ease, color 0.6s ease, box-shadow 0.6s ease",
                          }}
                          className="inline-flex items-center rounded-full px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-medium border border-[color:var(--border)]"
                        >
                          {label}
                        </motion.span>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
