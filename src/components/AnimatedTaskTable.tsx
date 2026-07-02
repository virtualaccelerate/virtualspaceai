import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Database, TrendingUp, BarChart3, Users, Settings2, Sparkles } from "lucide-react";

type Lang = "en" | "ru" | "es" | "de" | "fr";

const COPY: Record<Lang, {
  eyebrow: string; title: string; titleAccent: string; body: string; caption: string;
  columns: string[];
}> = {
  en: {
    eyebrow: "Live Workspace",
    title: "AI can automate your business processes",
    titleAccent: "today.",
    body: "Imagine a live workspace where every department has its own AI-powered support system. Tasks move across your business automatically: data is updated, leads are analyzed, reports are created, candidates are screened, documents are organized, and teams stay aligned.",
    caption: "AI can automate your processes today — from small daily tasks to complex business workflows.",
    columns: ["Data & Knowledge", "Sales", "Analytics", "HR", "Operations"],
  },
  ru: {
    eyebrow: "Живое пространство",
    title: "ИИ может автоматизировать ваши бизнес-процессы",
    titleAccent: "уже сегодня.",
    body: "Представьте живое рабочее пространство, где у каждого отдела есть свой ИИ-помощник. Задачи движутся по бизнесу автоматически: данные обновляются, лиды анализируются, отчёты создаются, кандидаты проверяются, документы систематизируются, а команды остаются на одной волне.",
    caption: "ИИ автоматизирует ваши процессы уже сегодня — от мелких ежедневных задач до сложных бизнес-потоков.",
    columns: ["Данные и Знания", "Продажи", "Аналитика", "HR", "Операции"],
  },
  es: {
    eyebrow: "Espacio en vivo",
    title: "La IA puede automatizar tus procesos de negocio",
    titleAccent: "hoy.",
    body: "Imagina un espacio de trabajo en vivo donde cada departamento tiene su propio sistema de soporte con IA. Las tareas fluyen automáticamente: se actualizan datos, se analizan leads, se generan informes, se filtran candidatos, se organizan documentos y los equipos permanecen alineados.",
    caption: "La IA puede automatizar tus procesos hoy — desde pequeñas tareas diarias hasta flujos de trabajo complejos.",
    columns: ["Datos y Conocimiento", "Ventas", "Analítica", "RRHH", "Operaciones"],
  },
  de: {
    eyebrow: "Live-Workspace",
    title: "KI kann Ihre Geschäftsprozesse automatisieren",
    titleAccent: "schon heute.",
    body: "Stellen Sie sich einen Live-Workspace vor, in dem jede Abteilung ihr eigenes KI-Support-System hat. Aufgaben bewegen sich automatisch durch Ihr Unternehmen: Daten werden aktualisiert, Leads analysiert, Berichte erstellt, Kandidaten geprüft, Dokumente organisiert und Teams bleiben abgestimmt.",
    caption: "KI kann Ihre Prozesse heute automatisieren — von kleinen täglichen Aufgaben bis zu komplexen Workflows.",
    columns: ["Daten & Wissen", "Vertrieb", "Analytik", "HR", "Betrieb"],
  },
  fr: {
    eyebrow: "Espace en direct",
    title: "L'IA peut automatiser vos processus métier",
    titleAccent: "dès aujourd'hui.",
    body: "Imaginez un espace de travail vivant où chaque département dispose de son propre système de support IA. Les tâches circulent automatiquement dans votre entreprise : les données sont mises à jour, les leads analysés, les rapports générés, les candidats filtrés, les documents organisés et les équipes restent alignées.",
    caption: "L'IA peut automatiser vos processus dès aujourd'hui — des petites tâches quotidiennes aux flux de travail complexes.",
    columns: ["Données & Savoir", "Ventes", "Analyse", "RH", "Opérations"],
  },
};

// 5 columns x 6 rows = 30 tasks (universal English business terms)
const TASKS: string[][] = [
  // Data & Knowledge
  ["Update database", "Organize files", "Extract insights", "Summarize documents", "Clean data", "Build knowledge base"],
  // Sales
  ["Qualify leads", "Draft follow-up emails", "Update CRM", "Analyze pipeline", "Prepare client briefs", "Track opportunities"],
  // Analytics
  ["Generate reports", "Analyze trends", "Compare KPIs", "Monitor performance", "Create dashboards", "Find risks"],
  // HR
  ["Screen candidates", "Summarize CVs", "Draft job posts", "Track applications", "Prepare onboarding", "Collect feedback"],
  // Operations
  ["Assign tasks", "Track deadlines", "Create meeting summaries", "Monitor workflows", "Prepare action plans", "Automate approvals"],
];

const COL_ICONS = [Database, TrendingUp, BarChart3, Users, Settings2];

export function AnimatedTaskTable() {
  const { i18n } = useTranslation();
  const langCode = (i18n.language?.split("-")[0] ?? "en") as Lang;
  const copy = COPY[langCode] ?? COPY.en;

  return (
    <section id="tasks" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">{copy.eyebrow}</p>
          <h2 className="mt-4 font-display text-4xl sm:text-6xl leading-tight text-white">
            {copy.title} <em className="italic grad-accent">{copy.titleAccent}</em>
          </h2>
          <p className="mt-6 text-white/70 leading-relaxed text-base sm:text-lg">{copy.body}</p>
        </motion.div>

        {/* Table wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 glass-strong rounded-3xl p-3 sm:p-6 overflow-x-auto"
        >
          <div className="min-w-[720px]">
            {/* Column headers */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-3">
              {copy.columns.map((col, i) => {
                const Icon = COL_ICONS[i];
                return (
                  <motion.div
                    key={col}
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="glass rounded-2xl px-3 py-3 flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.5} />
                    <span className="text-white text-xs sm:text-sm font-medium truncate">{col}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Task cells */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {TASKS.map((column, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-2 sm:gap-3">
                  {column.map((task, rowIdx) => {
                    const totalDelay = (colIdx + rowIdx) * 0.06;
                    return (
                      <motion.div
                        key={task}
                        initial={{ opacity: 0, scale: 0.9, y: 12 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, margin: "-30px" }}
                        transition={{
                          delay: totalDelay,
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        className="group relative rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-primary/40 transition-all px-3 py-3 sm:px-4 sm:py-4 overflow-hidden"
                      >
                        {/* Animated pulse dot */}
                        <motion.span
                          className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary"
                          animate={{
                            opacity: [0.3, 1, 0.3],
                            scale: [1, 1.4, 1],
                          }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            delay: totalDelay,
                            ease: "easeInOut",
                          }}
                        />
                        <div className="flex items-start gap-2">
                          <Sparkles
                            className="h-3.5 w-3.5 text-primary/70 mt-0.5 shrink-0 group-hover:text-primary transition-colors"
                            strokeWidth={1.75}
                          />
                          <span className="text-white/80 text-xs sm:text-sm leading-snug group-hover:text-white transition-colors">
                            {task}
                          </span>
                        </div>
                        {/* Shimmer sweep */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
                          initial={false}
                          animate={{
                            background: [
                              "linear-gradient(110deg, transparent 0%, transparent 40%, rgba(115,217,79,0.10) 50%, transparent 60%, transparent 100%)",
                            ],
                          }}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-8 text-center text-white/60 text-sm sm:text-base max-w-2xl mx-auto"
        >
          {copy.caption}
        </motion.p>
      </div>
    </section>
  );
}
