import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowUpRight, Languages, Briefcase, Award, Target } from "lucide-react";
import { getMentor } from "@/lib/mentors.functions";
import { formatRate, initials } from "@/components/MentorsCatalog";

export const Route = createFileRoute("/mentors/$id")({
  loader: async ({ params }) => {
    const mentor = await getMentor({ data: { id: params.id } }).catch(() => null);
    if (!mentor) throw notFound();
    return { mentor };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Mentor — Virtual Space" }, { name: "robots", content: "noindex" }] };
    }
    const m = loaderData.mentor;
    const title = `${m.full_name} — ${m.role_title || "Mentor"} | Virtual Space`;
    const description = (m.short_bio || m.full_bio || `Book a consultation with ${m.full_name}.`).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MentorDetail,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-white/70">Mentor not found</div>
  ),
});

function Block({ icon: Icon, title, body }: { icon: typeof Award; title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-white">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <p className="mt-3 text-sm text-white/65 leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
}

function MentorDetail() {
  const { mentor } = Route.useLoaderData();
  const { t } = useTranslation();
  const rate = formatRate(mentor.hourly_rate, mentor.currency);
  const bookHref = mentor.booking_url || "/book-demo";
  const external = Boolean(mentor.booking_url);

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link to="/" hash="mentors" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> {t("mentors.back", "All mentors")}
        </Link>

        <header className="glass-strong rounded-3xl p-6 sm:p-8 mt-5 flex flex-col sm:flex-row gap-6">
          {mentor.photo_url ? (
            <img
              src={mentor.photo_url}
              alt={mentor.full_name}
              className="h-28 w-28 rounded-3xl object-cover bg-white/5 shrink-0"
            />
          ) : (
            <div className="h-28 w-28 rounded-3xl bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
              {initials(mentor.full_name)}
            </div>
          )}

          <div className="flex-1">
            <h1 className="font-display text-2xl sm:text-4xl text-white leading-tight">{mentor.full_name}</h1>
            {(mentor.role_title || mentor.company) && (
              <p className="mt-2 text-sm text-white/60">
                {[mentor.role_title, mentor.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {mentor.languages?.length > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/50">
                <Languages className="h-3.5 w-3.5" /> {mentor.languages.join(", ")}
              </p>
            )}
            {rate && (
              <p className="mt-3 text-base text-white/85">
                <span className="font-semibold text-primary">{rate}</span>{" "}
                <span className="text-white/50">{t("mentors.perHour", "/ hour")}</span>
              </p>
            )}
            <MentorBookingDialog mentorName={mentor.full_name} rate={rate}>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition">
                {t("mentors.book", "Book a mentor")} <ArrowUpRight className="h-4 w-4" />
              </button>
            </MentorBookingDialog>

          </div>
        </header>

        <div className="mt-5 grid gap-4">
          <Block icon={Briefcase} title={t("mentors.dossier", "Professional dossier")} body={mentor.full_bio || mentor.short_bio} />
          <Block icon={Award} title={t("mentors.experience", "Experience & achievements")} body={[mentor.experience, mentor.achievements].filter(Boolean).join("\n\n")} />
          <Block icon={Target} title={t("mentors.topics", "Consultation topics")} body={mentor.topics} />

          {(mentor.expertise?.length > 0 || mentor.industries?.length > 0) && (
            <section className="glass rounded-3xl p-5 sm:p-6 grid gap-5 sm:grid-cols-2">
              {mentor.expertise?.length > 0 && (
                <div>
                  <h2 className="font-display text-lg text-white">{t("mentors.expertise", "Areas of expertise")}</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mentor.expertise.map((tag: string) => (
                      <span key={tag} className="text-[11px] text-white/60 border border-white/10 rounded-full px-3 py-1">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {mentor.industries?.length > 0 && (
                <div>
                  <h2 className="font-display text-lg text-white">{t("mentors.industries", "Industries")}</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {mentor.industries.map((tag: string) => (
                      <span key={tag} className="text-[11px] text-white/60 border border-white/10 rounded-full px-3 py-1">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
