import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Clock, CreditCard, Layers, Loader2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listCourses,
  myPurchases,
  startCoursePurchase,
  getCourseVideo,
  type CourseRow,
  type PurchaseRow,
} from "@/lib/courses.functions";

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => listCourses(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchases(enabled: boolean) {
  return useQuery({
    queryKey: ["course-purchases"],
    queryFn: () => myPurchases(),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function formatPrice(price: number, currency: string) {
  const value = Number(price);
  const amount = Number.isInteger(value) ? value.toLocaleString("ru-RU") : value.toFixed(2);
  return `${amount} ${currency || "KGS"}`;
}

export function courseTitle(c: CourseRow, lang: string) {
  return (lang.startsWith("en") ? c.title : c.title_ru || c.title) || c.title;
}

export function courseDescription(c: CourseRow, lang: string) {
  return (lang.startsWith("en") ? c.description : c.description_ru || c.description) || c.description;
}

function CourseCard({
  course,
  index,
  purchase,
  onBuy,
  onWatch,
  busy,
}: {
  course: CourseRow;
  index: number;
  purchase: PurchaseRow | undefined;
  onBuy: (c: CourseRow) => void;
  onWatch: (c: CourseRow) => void;
  busy: boolean;
}) {
  const { t, i18n } = useTranslation();
  const paid = purchase?.status === "paid";
  const pending = purchase?.status === "pending";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: Math.min(index, 5) * 0.06 }}
      className="glass-strong rounded-3xl overflow-hidden flex flex-col h-full"
    >
      {course.cover_url ? (
        <img
          src={course.cover_url}
          alt={courseTitle(course, i18n.language)}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 w-full bg-primary/10 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-primary/70" />
        </div>
      )}

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <h3 className="font-display text-lg text-white leading-tight">{courseTitle(course, i18n.language)}</h3>
        <p className="mt-2 text-sm text-white/60 leading-relaxed line-clamp-4">
          {courseDescription(course, i18n.language)}
        </p>

        {(course.duration || course.lessons_count > 0 || course.level) && (
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-white/45">
            {course.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {course.duration}
              </span>
            )}
            {course.lessons_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3 w-3" /> {course.lessons_count} {t("courses.lessons", "lessons")}
              </span>
            )}
            {course.level && <span>{course.level}</span>}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="font-display text-xl text-white">{formatPrice(course.price, course.currency)}</div>

          {paid ? (
            <button
              onClick={() => onWatch(course)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" /> {t("courses.watch", "Watch course")}
            </button>
          ) : (
            <button
              onClick={() => onBuy(course)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {t("courses.buy", "Buy course")}
            </button>
          )}
        </div>

        {pending && (
          <p className="mt-3 text-[11px] text-amber-300/80">
            {t("courses.pendingNote", "Payment is being confirmed. Access opens right after confirmation.")}
          </p>
        )}
      </div>
    </motion.article>
  );
}

function PlaceholderCard() {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center text-center min-h-[260px] border border-dashed border-white/10">
      <BookOpen className="h-6 w-6 text-white/25" />
      <p className="mt-3 text-sm font-semibold text-white/70">{t("courses.soon", "New course soon")}</p>
      <p className="mt-1 text-xs text-white/45">{t("courses.soonBody", "The program is being prepared.")}</p>
    </div>
  );
}

export function CoursesGrid({ items }: { items: CourseRow[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const purchases = usePurchases(signedIn === true);

  // resolve session lazily (once)
  if (signedIn === null) {
    void supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }

  const purchaseFor = (id: string) => purchases.data?.find((p) => p.course_id === id);

  const handleBuy = async (course: CourseRow) => {
    setNotice(null);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      try { localStorage.setItem("vs-after-auth", "/courses"); } catch { /* ignore */ }
      void navigate({ to: "/auth" });
      return;
    }
    setBusyId(course.id);
    try {
      const res = await startCoursePurchase({ data: { courseId: course.id } });
      await queryClient.invalidateQueries({ queryKey: ["course-purchases"] });
      if (res.status === "paid") return;
      if (res.paymentUrl) {
        window.open(res.paymentUrl, "_blank", "noopener,noreferrer");
        setNotice(t("courses.redirect", "Complete the payment in Finik — access opens after confirmation."));
      } else {
        setNotice(t("courses.noLink", "Payment link is not configured yet. Please contact us."));
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  };

  const handleWatch = async (course: CourseRow) => {
    setBusyId(course.id);
    setNotice(null);
    try {
      const res = await getCourseVideo({ data: { courseId: course.id } });
      if (res.videoUrl) {
        window.open(res.videoUrl, "_blank", "noopener,noreferrer");
      } else {
        setNotice(t("courses.videoSoon", "The video will be added soon."));
      }
    } finally {
      setBusyId(null);
    }
  };

  const placeholders = Math.max(0, 3 - items.length);

  return (
    <div>
      {notice && (
        <p className="mb-4 glass rounded-2xl px-4 py-3 text-sm text-white/75">{notice}</p>
      )}
      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => (
          <CourseCard
            key={c.id}
            course={c}
            index={i}
            purchase={purchaseFor(c.id)}
            onBuy={handleBuy}
            onWatch={handleWatch}
            busy={busyId === c.id}
          />
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <PlaceholderCard key={`ph-${i}`} />
        ))}
      </div>
    </div>
  );
}

export function CoursesSection() {
  const { t } = useTranslation();
  const { data } = useCourses();

  return (
    <section id="courses" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="font-display text-3xl sm:text-5xl leading-tight text-white">
            {t("courses.title", "Courses")}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed">
            {t("courses.subtitle", "Practical programs on AI, operations and growth — buy and start right away.")}
          </p>
        </motion.div>

        <div className="mt-10">
          <CoursesGrid items={data ?? []} />
        </div>
      </div>
    </section>
  );
}
