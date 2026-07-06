import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Virtual Space" },
      { name: "description", content: "Sign in to Virtual Space with Google or a magic link." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, go to /app
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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setLoading(false);
    }
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
      // If session is set here, navigate now; otherwise redirect happens
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
          <h1 className="font-display text-3xl text-white text-center">Sign in</h1>
          <p className="mt-2 text-sm text-white/60 text-center">
            Access your Virtual Space workspace.
          </p>

          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
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

          {sent ? (
            <div className="glass rounded-2xl p-5 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <p className="text-white font-medium text-sm">Check your inbox</p>
              <p className="mt-1 text-xs text-white/60">
                We sent a magic link to <span className="text-white/80">{email}</span>. Click it to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="mt-4 text-xs text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
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
              {error && <p className="text-xs text-destructive px-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send magic link <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[11px] text-white/40">
            By signing in you agree to our terms and privacy policy.
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
