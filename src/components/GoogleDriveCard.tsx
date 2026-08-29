import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HardDrive,
  Check,
  Loader2,
  RefreshCw,
  FileText,
  Folder,
  ExternalLink,
  FilePlus2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import {
  startGoogleDriveConnect,
  completeGoogleDriveConnect,
  googleDriveStatus,
  googleDriveListFiles,
  googleDriveDisconnect,
  googleDriveCreateDocWithContent,
} from "@/lib/google-drive.functions";
import { Button } from "@/components/ui/button";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
};

function waitForOAuthCompletion(popup: Window) {
  return new Promise<string | null>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type;
      if (
        event.origin !== window.location.origin ||
        event.data?.connectorId !== "google_drive" ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      )
        return;
      cleanup();
       if (type === "appUserConnectorOAuthComplete") {
         return resolve(typeof event.data?.code === "string" ? event.data.code : null);
       }
      popup.close();
      reject(new Error("OAuth failed"));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("closed"));
    }, 500);
  });
}

export function GoogleDriveCard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [docName, setDocName] = useState("");
  const [docContent, setDocContent] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const reconnectRequired = error?.includes("GOOGLE_DRIVE_RECONNECT_REQUIRED") ?? false;
  const friendlyError = reconnectRequired
    ? t("app.integrations.reconnectRequired", "Срок доступа истёк. Подключите Google Drive повторно.")
    : error;

  const createDoc = async () => {
    if (!docName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const file = (await googleDriveCreateDocWithContent({
        data: { name: docName.trim(), content: docContent },
      })) as DriveFile;
      setCreatedLink(file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`);
      setDocName("");
      setDocContent("");
      setCreating(false);
      window.open(
        file.webViewLink ?? `https://docs.google.com/document/d/${file.id}/edit`,
        "_blank",
        "noreferrer",
      );
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (message.includes("GOOGLE_DRIVE_RECONNECT_REQUIRED")) setConnected(false);
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    try {
      const status = await googleDriveStatus();
      setConnected(status.connected);
      setEmail(status.email);
      if (status.connected) {
        const res = await googleDriveListFiles({ data: {} });
        if (res.reconnectRequired) {
          setConnected(false);
          setFiles([]);
          setError("GOOGLE_DRIVE_RECONNECT_REQUIRED");
        } else {
          setFiles((res.files as DriveFile[]).slice(0, 6));
        }
      } else {
        setFiles([]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (message.includes("GOOGLE_DRIVE_RECONNECT_REQUIRED")) {
        setConnected(false);
        setFiles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setError(null);
    const popup = window.open("", "google-drive-oauth", "width=600,height=740");
    if (!popup) {
      setError(t("app.integrations.popupBlocked", "Разрешите всплывающие окна и попробуйте снова."));
      return;
    }
    setBusy(true);
    try {
      const { authorizationUrl } = await startGoogleDriveConnect();
      const done = waitForOAuthCompletion(popup);
      popup.location.href = authorizationUrl;
      const code = await done;
      if (code) await completeGoogleDriveConnect({ data: { code } });
      await refresh();
    } catch (e) {
      popup.close();
      if (e instanceof Error && e.message !== "closed") {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await googleDriveDisconnect();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-4 border border-white/10 flex flex-col gap-3 sm:col-span-2 lg:col-span-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-yellow-400">
          <HardDrive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-white text-sm">Google Drive</div>
            {connected && (
              <span className="text-[9px] uppercase tracking-wider text-primary border border-primary/30 rounded-full px-1.5 py-0.5 inline-flex items-center gap-1">
                <Check className="h-2.5 w-2.5" />
                {t("app.integrations.connected", "Подключено")}
              </span>
            )}
          </div>
          <p className="text-xs text-white/55 mt-0.5 leading-snug">
            {connected && email
              ? email
              : t(
                  "app.integrations.desc.gdriveFull",
                  "Чтение и поиск файлов, Google Docs, создание документов и папок, перемещение файлов.",
                )}
          </p>
        </div>
        {connected && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            className="text-muted-foreground"
            title={t("app.integrations.refresh", "Обновить")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {connected && files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-xs text-white/70">
              {f.mimeType === "application/vnd.google-apps.folder" ? (
                <Folder className="h-3.5 w-3.5 text-white/40 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-white/40 shrink-0" />
              )}
              <span className="truncate">{f.name}</span>
              {f.webViewLink && (
                <a
                  href={f.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/40 hover:text-primary shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {connected && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          {!creating ? (
            <Button
              variant="secondary"
              onClick={() => setCreating(true)}
              className="w-full text-xs"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              {t("app.integrations.createDoc", "Создать документ в Google Docs")}
            </Button>
          ) : (
            <>
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder={t("app.integrations.docTitle", "Название документа")}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-primary/50"
              />
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={4}
                placeholder={t("app.integrations.docContent", "Текст документа (необязательно)")}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/35 outline-none focus:border-primary/50 resize-y"
              />
              <div className="flex gap-2">
                <Button
                  disabled={busy || !docName.trim()}
                  onClick={() => void createDoc()}
                  className="flex-1 text-xs"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("app.integrations.create", "Создать")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCreating(false)}
                  className="text-xs"
                >
                  {t("common.cancel", "Отмена")}
                </Button>
              </div>
            </>
          )}
          {createdLink && (
            <a
              href={createdLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {t("app.integrations.openDoc", "Открыть созданный документ")}
            </a>
          )}
        </div>
      )}

      {friendlyError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{friendlyError}</span>
        </div>
      )}

      <button type="button" onClick={() => setGuideOpen((value) => !value)} className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground">
        <span>{t("app.integrations.guide", "Как подключить")}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
      </button>
      {guideOpen && (
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>{t("app.integrations.driveGuide1", "Нажмите «Подключить» и выберите свой Google-аккаунт.")}</li>
          <li>{t("app.integrations.driveGuide2", "Разрешите доступ к файлам и документам Drive.")}</li>
          <li>{t("app.integrations.driveGuide3", "После подключения AI сможет читать доступные вам файлы и все листы таблиц.")}</li>
        </ol>
      )}

      <Button
        disabled={busy || loading}
        variant={connected ? "outline" : "default"}
        onClick={() => void (connected && !reconnectRequired ? disconnect() : connect())}
        className="w-full text-xs"
      >
        {(busy || loading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {connected
          ? t("app.integrations.disconnect", "Отключить")
          : reconnectRequired
            ? t("app.integrations.reconnect", "Подключить повторно")
            : t("app.integrations.connect", "Подключить")}
      </Button>
    </div>
  );
}
