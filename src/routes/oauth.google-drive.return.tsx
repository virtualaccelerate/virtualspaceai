import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { completeGoogleDriveConnect } from "@/lib/google-drive.functions";

export const Route = createFileRoute("/oauth/google-drive/return")({
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Завершаем подключение Google Drive…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_drive" },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Подключение не завершено.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Google не вернул код подтверждения.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    void completeGoogleDriveConnect({ data: { code } })
      .then(() => notify("appUserConnectorOAuthComplete"))
      .catch(() => {
        setMessage("Не удалось сохранить подключение.");
        notify("appUserConnectorOAuthFailed");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-white/70">
      {message}
    </div>
  );
}
