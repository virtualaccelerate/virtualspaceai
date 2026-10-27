import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{part}</a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Collapsible numbered setup guide, same toggle pattern as the Google Drive card. */
export function IntegrationGuide({ prefix, steps, connected }: { prefix: string; steps: number; connected: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!connected);
  useEffect(() => setOpen(!connected), [connected]);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground">
        <span>{t(`${prefix}.title`, "Connection guide")}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-xs leading-relaxed text-muted-foreground">
            {Array.from({ length: steps }, (_, i) => (
              <li key={i}>
                <span className="font-semibold text-foreground">{t(`${prefix}.s${i + 1}t`)}</span>
                {" — "}
                <Linkified text={t(`${prefix}.s${i + 1}d`)} />
              </li>
            ))}
          </ol>
          <div className="rounded-md border border-border bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{t(`${prefix}.noteTitle`)}:</span> {t(`${prefix}.note`)}
          </div>
        </div>
      )}
    </div>
  );
}
