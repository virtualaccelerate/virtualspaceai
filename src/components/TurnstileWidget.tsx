import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type TS = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: TS } }

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TS> | null = null;
function loadScript(): Promise<TS> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TS>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC; s.async = true; s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    s.onerror = () => { loading = null; reject(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return loading;
}

export type TurnstileHandle = { reset: () => void };

export const TurnstileWidget = forwardRef<TurnstileHandle, {
  siteKey: string; language: string; onToken: (t: string | null) => void; onError: () => void;
}>(function TurnstileWidget({ siteKey, language, onToken, onError }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset: () => { cb.current.onToken(null); if (id.current && window.turnstile) window.turnstile.reset(id.current); },
  }));

  useEffect(() => {
    let alive = true;
    loadScript().then((ts) => {
      if (!alive || !box.current) return;
      id.current = ts.render(box.current, {
        sitekey: siteKey,
        theme: "auto",
        language: language || "auto",
        callback: (t: string) => cb.current.onToken(t),
        "expired-callback": () => cb.current.onToken(null),
        "error-callback": () => { cb.current.onToken(null); cb.current.onError(); },
      });
    }).catch(() => alive && cb.current.onError());
    return () => {
      alive = false;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [siteKey, language]);

  return <div ref={box} className="flex justify-center min-h-[65px]" />;
});
