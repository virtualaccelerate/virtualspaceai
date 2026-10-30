import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { LANGUAGES, persistLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState<string | null>(null);
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
      <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button
        variant="ghost"
        size={compact ? "icon" : "default"}
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        title="Language"
        aria-expanded={open}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Globe className="h-4 w-4" />
        {!compact && <span className="uppercase">{current.code}</span>}
      </Button></TooltipTrigger><TooltipContent>Language</TooltipContent></Tooltip></TooltipProvider>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 p-1">
          {LANGUAGES.map((l) => (
            <Button
              variant="ghost"
              key={l.code}
              loading={changing === l.code}
              disabled={changing !== null}
              onClick={async () => {
                setChanging(l.code);
                try {
                  await i18n.changeLanguage(l.code);
                  persistLanguage(l.code);
                  setOpen(false);
                } finally { setChanging(null); }
              }}
              className="w-full justify-start text-foreground [&>span]:w-full [&>span]:justify-between"
            >
              {l.label}
              {l.code === current.code && <Check className="h-3.5 w-3.5 text-primary" />}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
