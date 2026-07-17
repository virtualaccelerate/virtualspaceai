import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition ${
          compact ? "h-9 w-9 justify-center" : "px-2.5 h-9"
        }`}
      >
        <Globe className="h-4 w-4" />
        {!compact && <span className="uppercase">{current.code}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/10 bg-[color:var(--card)] shadow-2xl overflow-hidden z-50 p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                void i18n.changeLanguage(l.code);
                try { localStorage.setItem("i18nextLng", l.code); } catch { /* ignore */ }
                setOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              {l.label}
              {l.code === current.code && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
