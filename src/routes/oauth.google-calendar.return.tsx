import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({ meta: [
    { title: "Google Calendar connection — Virtual Space" },
    { name: "description", content: "Complete your personal Google Calendar connection to Virtual Space." },
    { property: "og:title", content: "Google Calendar connection — Virtual Space" },
    { property: "og:description", content: "Complete your personal Google Calendar connection to Virtual Space." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: OAuthReturn,
});
function OAuthReturn() {
  const [message, setMessage] = useState("Completing Google Calendar connection…");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", code?: string) => {
      window.opener?.postMessage({ type, connectorId: "google_calendar", code: code ?? null }, window.location.origin);
      window.close();
    };
    if (params.get("success") !== "true") { setMessage(params.get("error") ?? "Connection was not completed."); notify("appUserConnectorOAuthFailed"); return; }
    const code = params.get("code");
    if (!code) { setMessage("Google did not return a confirmation code."); notify("appUserConnectorOAuthFailed"); return; }
    notify("appUserConnectorOAuthComplete", code);
  }, []);
  return <div className="min-h-screen flex items-center justify-center p-6 text-center text-sm text-muted-foreground">{message}</div>;
}
