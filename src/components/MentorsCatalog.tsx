import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Languages, Sparkles } from "lucide-react";
import { listMentors, type MentorRow } from "@/lib/mentors.functions";

export function useMentors() {
  return useQuery({
    queryKey: ["mentors"],
    queryFn: () => listMentors(),
    staleTime: 5 * 60 * 1000,
  });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatRate(rate: number | null, currency: string) {
  if (rate == null) return null;
  const value = Number(rate);
  const amount = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${amount} ${currency || "USD"}`;
}

export function MentorCard({ item, index }: { item: MentorRow; index: number }) {
  const { t } = useTranslation();
  const rate = formatRate(item.hourly_rate, item.currency);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index, 5) * 0.06 }}
      className="glass-strong rounded-3xl p-5 sm:p-6 flex flex-col h-full"
    >
      <div className="flex items-center gap-4">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt={item.full_name}
            loading="lazy"
            className="h-16 w-16 rounded-2xl object-cover bg-white/5"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-base font-bold">
            {initials(item.full_name)}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-lg text-white leading-tight truncate">{item.full_name}</h3>
          {(item.role_title || item.company) && (
            <p className="mt-1 text-xs text-white/55 leading-snug">
              {[item.role_title, item.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {item.short_bio && <p className="mt-4 text-sm text-white/60 leading-relaxed flex-1">{item.short_bio}</p>}

      {item.expertise?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.expertise.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider text-white/50 border border-white/10 rounded-full px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {item.languages?.length > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/50">
          <Languages className="h-3.5 w-3.5" />
          {item.languages.join(", ")}
        </p>
      )}

      {rate && (
        <p className="mt-3 text-sm text-white/80">
          <span className="font-semibold text-primary">{rate}</span>{" "}
          <span className="text-white/50">{t("mentors.perHour", "/ hour")}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/mentors/$id"
          params={{ id: item.id }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
        >
          {t("mentors.book", "Book a mentor")} <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link
          to="/mentors/$id"
          params={{ id: item.id }}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 hover:text-white hover:border-white/30 transition"
        >
          {t("mentors.details", "Details")}
        </Link>
      </div>
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
      <p className="text-sm font-semibold text-white/70">{t("mentors.soon", "New mentors soon")}</p>
      <p className="mt-1.5 text-xs text-white/45 max-w-[210px] leading-relaxed">
        {t("mentors.soonBody", "We are curating experts across product, finance and growth.")}
      </p>
    </div>
  );
}

export function MentorsGrid({ items }: { items: MentorRow[] }) {
  const placeholders = Math.max(0, 3 - items.length);
  return (
    <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <MentorCard key={item.id} item={item} index={i} />
      ))}
      {Array.from({ length: placeholders }).map((_, i) => (
        <PlaceholderCard key={`ph-${i}`} />
      ))}
    </div>
  );
}

export function MentorsSection() {
  const { t } = useTranslation();
  const { data } = useMentors();

  return (
    <section id="mentors" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="font-display text-3xl sm:text-5xl leading-tight text-white">
            {t("mentors.title", "Mentors")}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed">
            {t("mentors.subtitle", "Book an hour with an expert and get practical guidance for your business.")}
          </p>
        </motion.div>

        <div className="mt-10">
          <MentorsGrid items={data ?? []} />
        </div>
      </div>
    </section>
  );
}
