import type { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";

/** Renders children only for workspace owners and admins. */
export function ManagerOnly({ children }: { children: ReactNode }) {
  const { isManager, loading } = useWorkspaceRole();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-base font-medium">
            {t("access.managerOnly.title", "Раздел для руководителей")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "access.managerOnly.description",
              "Доступ к этому разделу есть только у владельца и администраторов пространства.",
            )}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
