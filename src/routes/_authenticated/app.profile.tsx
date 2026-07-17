import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Profile = {
  full_name: string;
  company: string;
  language: string;
  avatar_url: string;
  email: string;
};

function ProfilePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    company: "",
    language: "en",
    avatar_url: "",
    email: "",
  });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserId(userData.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, company, language, avatar_url, email")
        .eq("id", userData.user.id)
        .maybeSingle();
      setProfile({
        full_name: data?.full_name ?? "",
        company: data?.company ?? "",
        language: data?.language ?? "en",
        avatar_url: data?.avatar_url ?? "",
        email: data?.email ?? userData.user.email ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name || null,
        company: profile.company || null,
        language: profile.language,
        avatar_url: profile.avatar_url || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="font-display text-3xl text-white">{t("app.profile.title")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("app.profile.subtitle")}</p>
      </motion.div>


      <form onSubmit={handleSave} className="mt-8 glass-strong rounded-3xl p-6 sm:p-8 space-y-5">
        <Field label={t("app.profile.email")}>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/60 cursor-not-allowed"
          />
        </Field>

        <Field label={t("app.profile.fullName")}>
          <input
            type="text"
            maxLength={120}
            value={profile.full_name}
            onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </Field>

        <Field label={t("app.profile.company")}>
          <input
            type="text"
            maxLength={200}
            value={profile.company}
            onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </Field>

        <Field label={t("app.profile.avatarUrl")}>
          <input
            type="url"
            value={profile.avatar_url}
            onChange={(e) => setProfile((p) => ({ ...p, avatar_url: e.target.value }))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="https://…"
          />
        </Field>

        <Field label={t("app.profile.language")}>
          <select
            value={profile.language}
            onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
            <option value="kk">Қазақша</option>
            <option value="ky">Кыргызча</option>
            <option value="uz">Oʻzbekcha</option>
            <option value="tg">Тоҷикӣ</option>

          </select>
        </Field>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? (<><Check className="h-4 w-4" /> {t("app.profile.saved")}</>) : t("app.profile.save")}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-white/70 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
