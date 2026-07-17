import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualSpaceLogo } from "@/components/VirtualSpaceLogo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase recovery link sets a session via hash fragment
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate({ to: "/app", replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
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
        <div className="glass-strong w-full max-w-md rounded-3xl p-8">
          <h1 className="font-display text-2xl text-white text-center">Set a new password</h1>
          <p className="mt-2 text-sm text-white/60 text-center">
            {ready
              ? "Enter a new password for your account."
              : "Open this page from the reset link in your email."}
          </p>

          {done ? (
            <div className="mt-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-white/80">Password updated. Redirecting…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8)"
                  disabled={!ready}
                  className="glass w-full rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
              </div>
              {error && <p className="text-xs text-destructive px-2">{error}</p>}
              <button
                type="submit"
                disabled={loading || !ready}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-white/50">
            <Link to="/auth" className="hover:text-white">Back to sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
