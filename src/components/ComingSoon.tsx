import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  description,
  icon: Icon = Sparkles,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-strong rounded-3xl p-10 sm:p-14 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl text-white">{title}</h1>
        <p className="mt-3 text-sm text-white/60 max-w-xl mx-auto">{description}</p>
        <span className="inline-block mt-6 text-[10px] uppercase tracking-widest text-white/40 border border-white/10 rounded-full px-3 py-1">
          Coming soon
        </span>
      </div>
    </div>
  );
}
