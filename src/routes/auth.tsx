import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Virtual Space" },
      { name: "description", content: "Sign in or create your Virtual Space account." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Mode = "signin" | "signup" | "forgot";

function friendlyAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code;
  if (code === "invalid_credentials" || /invalid login credentials/i.test(raw)) {
    return "Неверный email или пароль. Проверьте раскладку клавиатуры (EN/RU) и Caps Lock, или сбросьте пароль ниже.";
  }
  if (code === "user_already_exists" || /already registered/i.test(raw)) {
    return "Этот email уже зарегистрирован. Войдите или сбросьте пароль.";
  }
  if (code === "email_not_confirmed") {
    return "Email не подтверждён. Проверьте почту.";
  }
  return raw;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) navigate({ to: "/app", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/app", replace: true });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || loading) return;
    if (mode !== "forgot" && !password) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (err) throw err;
        if (!data.session) {
          setSent(true);
        } else {
          navigate({ to: "/app", replace: true });
        }
      } else if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (err) throw err;
      } else {
        // forgot password
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setInfo("Ссылка для сброса пароля отправлена на почту.");
      }
    } catch (err) {
      console.error(err);
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirm = async () => {
    if (!email.trim()) return;
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (err) setError(friendlyAuthError(err));
    else setInfo("Письмо отправлено повторно.");
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) navigate({ to: "/app", replace: true });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2">
          <VirtualSpaceLogo className="text-primary" size={26} />
          <span className="font-display font-extrabold tracking-tight text-lg text-white">Virtual Space</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-strong w-full max-w-md rounded-3xl p-8"
        >
          {sent ? (
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h1 className="font-display text-2xl text-white">Check your inbox</h1>
              <p className="mt-2 text-sm text-white/60">
                We sent a confirmation link to <span className="text-white/90">{email}</span>. Click it to activate your account.
              </p>
              {info && <p className="mt-3 text-xs text-primary">{info}</p>}
              {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleResendConfirm}
                  className="text-xs text-primary hover:underline"
                >
                  Resend email
                </button>
                <button
                  onClick={() => { setSent(false); setPassword(""); setMode("signin"); }}
                  className="text-xs text-white/60 hover:text-white"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl text-white text-center">
                {mode === "signup" ? "Create account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-white/60 text-center">
                {mode === "signup"
                  ? "Start your Virtual Space workspace."
                  : "Sign in to your Virtual Space workspace."}
              </p>

              <div className="mt-6 grid grid-cols-2 rounded-full bg-white/5 p-1">
                <button
                  onClick={() => { setMode("signup"); setError(null); }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    mode === "signup" ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign up
                </button>
                <button
                  onClick={() => { setMode("signin"); setError(null); }}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    mode === "signin" ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign in
                </button>
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/40">or email</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="glass w-full rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password (min 8)" : "Your password"}
                    className="glass w-full rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {error && <p className="text-xs text-destructive px-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create account" : "Sign in"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                {mode === "signup" && (
                  <p className="text-[11px] text-white/50 text-center pt-1">
                    You'll receive an email to confirm your address.
                  </p>
                )}
              </form>
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-white/40">
            By continuing you agree to our terms and privacy policy.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.12A6.98 6.98 0 0 1 5.47 12c0-.74.13-1.45.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.96l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
