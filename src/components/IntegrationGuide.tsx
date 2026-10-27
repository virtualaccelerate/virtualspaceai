import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ExternalLink, Info } from "lucide-react";

const URL_RE = /(https?:\/\/[^\s)]+)/g;

function stripUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Renders step text: quoted UI labels («…» or “…”) become chips, URLs are removed (shown as buttons). */
function StepText({ text }: { text: string }) {
  const cleaned = text
    .replace(/\s*\((?:[^()]*?)?https?:\/\/[^\s)]+\)/g, (m) => (m.replace(URL_RE, "").replace(/[:\s]*\)$/, ")").replace(/\(\s*\)/, "")))
    .replace(/(на|to|at)?\s*https?:\/\/[^\s)]+/gi, "")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\s{2,}/g, " ");
  const parts = cleaned.split(/(«[^»]+»|“[^”]+”)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^(«|“)/.test(part) ? (
          <span key={i} className="mx-0.5 inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.8em] font-medium text-foreground">
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Collapsible vertical stepper guide with live progress derived from the card's state. */
export function IntegrationGuide({
  prefix,
  steps,
  connected,
  name,
  doneSteps = [],
}: {
  prefix: string;
  steps: number;
  connected: boolean;
  name?: string;
  doneSteps?: number[];
}) {
  const { t } = useTranslation();
  const done = new Set(doneSteps);
  const doneCount = Array.from({ length: steps }, (_, i) => i + 1).filter((n) => done.has(n)).length;
  const allDone = doneCount === steps;
  const current = Array.from({ length: steps }, (_, i) => i + 1).find((n) => !done.has(n));
  const [open, setOpen] = useState(!allDone);
  useEffect(() => setOpen(!allDone), [allDone]);
  void connected;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <span>{t(`${prefix}.title`, "Connection guide")}</span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {allDone
            ? <span className="text-success">{t(`${prefix}.doneLabel`, { name, defaultValue: `Done ✓ — ${name} connected` })}</span>
            : t(`${prefix}.progress`, { current, total: steps, defaultValue: `Step ${current} of ${steps}` })}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={steps} aria-valuenow={doneCount}>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps) * 100}%` }} />
      </div>
      {open && (
        <div className="space-y-4">
          <ol className="relative">
            {Array.from({ length: steps }, (_, i) => {
              const n = i + 1;
              const isDone = done.has(n);
              const isCurrent = n === current;
              const desc = t(`${prefix}.s${n}d`);
              const urls = desc.match(URL_RE) ?? [];
              const last = n === steps;
              return (
                <li key={n} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && <span aria-hidden className="absolute left-[17px] top-10 bottom-0 w-px bg-border" />}
                  <span
                    aria-label={t(isDone ? `${prefix}.stepAriaDone` : isCurrent ? `${prefix}.stepAriaCurrent` : `${prefix}.stepAria`, { n, defaultValue: `Step ${n}` })}
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      isDone ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/30 ring-offset-2 ring-offset-background" : ""} ${!isDone && !isCurrent ? "opacity-70" : ""}`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : n}
                  </span>
                  <div className={`min-w-0 flex-1 rounded-lg px-3 py-2 ${isCurrent ? "bg-muted/60" : ""}`}>
                    <div className={`text-base font-semibold ${isDone ? "text-muted-foreground" : "text-foreground"}`}>{t(`${prefix}.s${n}t`)}</div>
                    <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted-foreground"><StepText text={desc} /></p>
                    {urls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {urls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {t(`${prefix}.open`, { host: stripUrl(url), defaultValue: `Open ${stripUrl(url)}` })}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm leading-relaxed text-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="max-w-[65ch]"><span className="font-semibold">{t(`${prefix}.noteTitle`)}:</span> {t(`${prefix}.note`)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
