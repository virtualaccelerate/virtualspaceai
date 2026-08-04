import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { listStartups, type StartupRow } from "@/lib/startups.functions";

export function useStartups() {
  return useQuery({
    queryKey: ["startups"],
    queryFn: () => listStartups(),
    staleTime: 5 * 60 * 1000,
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function StartupCard({ item, index }: { item: StartupRow; index: number }) {
  const { i18n, t } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const desc = (isEn ? item.description : item.description_ru || item.description) || "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index, 5) * 0.06 }}
      className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-3">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="h-12 w-12 rounded-2xl object-cover bg-white/5"
          />
        ) : (
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
            {initials(item.name)}
          </div>
        )}
        <h3 className="font-display text-lg sm:text-xl text-white leading-tight">{item.name}</h3>
      </div>

      <p className="mt-4 text-sm text-white/60 leading-relaxed flex-1">{desc}</p>

      {item.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {item.website_url && (
        <a
          href={item.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {item.cta_label || t("startups.cta")} <ArrowUpRight className="h-4 w-4" />
        </a>
      )}
    </motion.article>
  );
}

function PlaceholderCard() {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center min-h-[210px] border-dashed">
      <div className="h-11 w-11 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
        <Sparkles className="h-5 w-5 text-primary/70" />
      </div>
      <p className="text-sm font-semibold text-white/70">{t("startups.soon")}</p>
      <p className="mt-1.5 text-xs text-white/45 max-w-[200px] leading-relaxed">{t("startups.soonBody")}</p>
    </div>
  );
}

export function StartupsGrid({ items }: { items: StartupRow[] }) {
  const placeholders = Math.max(0, 6 - items.length);
  return (
    <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <StartupCard key={item.id} item={item} index={i} />
      ))}
      {Array.from({ length: placeholders }).map((_, i) => (
        <PlaceholderCard key={`ph-${i}`} />
      ))}
    </div>
  );
}

export function StartupsSection() {
  const { t } = useTranslation();
  const { data } = useStartups();

  return (
    <section id="startups" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="font-display text-3xl sm:text-5xl leading-tight text-white">{t("startups.title")}</h2>
          <p className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed">{t("startups.subtitle")}</p>
        </motion.div>

        <div className="mt-10">
          <StartupsGrid items={data ?? []} />
        </div>
      </div>
    </section>
  );
}
