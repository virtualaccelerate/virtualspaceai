import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/oauth/google-drive/return")({
  component: OAuthReturn,
});

function OAuthReturn() {
  const { t } = useTranslation();
  const [message, setMessage] = useState(t("integrationsUi.oauthReturn.completing", "Completing Google Drive connection…"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_drive", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? t("integrationsUi.oauthReturn.notCompleted", "Connection was not completed."));
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage(t("integrationsUi.oauthReturn.noCode", "Google did not return a confirmation code."));
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-white/70">
      {message}
    </div>
  );
}
