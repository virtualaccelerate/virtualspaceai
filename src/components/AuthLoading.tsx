import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AuthLoading() {
  const { t } = useTranslation();
  return <div role="status" aria-label={t("app.header.loading", "Loading…")} className="fixed inset-0 z-50 flex items-center justify-center bg-background text-primary"><Loader2 className="h-6 w-6 animate-spin" /></div>;
}