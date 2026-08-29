/** Google Drive App User Connector logic — server only. */
import {
  authorizeAppUserOAuth,
  callAsAppUser,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "@/integrations/lovable/appUserConnector";
import {
  deleteConnectionForUser,
  getConnectionKeyForUser,
  getConnectionRowForUser,
  saveConnectionKeyForUser,
} from "./app-user-connections.server";
import { extractSpreadsheetText, SPREADSHEET_EXT, SPREADSHEET_MIME } from "./documents-extract.server";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const CONNECTOR_ID = "google_drive";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

function clientApiKey(): string {
  const key = process.env['GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY'];
  if (!key) throw new Error("GOOGLE_DRIVE_APP_USER_CONNECTOR_CLIENT_API_KEY is not set");
  return key;
}

export async function startConnect(userId: string, origin: string) {
  const returnUrl = new URL("/oauth/google-drive/return", origin).toString();
  const existing = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  const { authorizationUrl } = await authorizeAppUserOAuth({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectorId: CONNECTOR_ID,
    appUserId: userId,
    clientAPIKey: clientApiKey(),
    returnUrl,
    connectionAPIKey: existing ?? undefined,
    credentialsConfiguration: { scopes: GOOGLE_SCOPES },
  });
  return { authorizationUrl };
}

export async function completeConnect(userId: string, code: string) {
  const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
  if (connectorId !== CONNECTOR_ID) throw new Error("OAuth completion returned the wrong connector");

  let email: string | null = null;
  try {
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/drive/v3/about?fields=user(emailAddress,displayName)",
    });
    if (res.ok) {
      const body = (await res.json()) as { user?: { emailAddress?: string } };
      email = body.user?.emailAddress ?? null;
    }
  } catch {
    /* email is optional metadata */
  }

  await saveConnectionKeyForUser(userId, CONNECTOR_ID, connectionAPIKey, email);
  return { ok: true, email };
}

export async function connectionStatus(userId: string) {
  const row = await getConnectionRowForUser(userId, CONNECTOR_ID);
  return {
    connected: !!row,
    email: row?.account_email ?? null,
    connectedAt: row?.updated_at ?? null,
  };
}

export const RECONNECT_REQUIRED = "GOOGLE_DRIVE_RECONNECT_REQUIRED";

function isExpired(status: number, text: string) {
  return (
    text.includes("credential_refresh_token_expired") ||
    text.includes("must re-authorize") ||
    text.includes("invalid_grant") ||
    ((status === 401 || status === 403) && text.includes("credential"))
  );
}

/** Drop a dead credential so the UI immediately shows "reconnect". */
async function markExpired(userId: string) {
  try {
    await deleteConnectionForUser(userId, CONNECTOR_ID);
  } catch {
    /* status refresh will retry */
  }
}

async function keyOrThrow(userId: string) {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (!key) throw new Error(RECONNECT_REQUIRED);
  return key;
}

/** Raw gateway call with shared expiry handling. */
export async function driveFetch(userId: string, path: string, init?: RequestInit) {
  const connectionAPIKey = await keyOrThrow(userId);
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: CONNECTOR_ID,
    path,
    init,
  });
  if (!res.ok) {
    const text = await res.clone().text();
    if (isExpired(res.status, text)) {
      await markExpired(userId);
      throw new Error(RECONNECT_REQUIRED);
    }
  }
  return res;
}

async function drive(userId: string, path: string, init?: RequestInit) {
  const res = await driveFetch(userId, path, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Drive request failed [${res.status}]: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}


export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
};

export async function listFiles(userId: string, search?: string, folderId?: string) {
  const clauses = ["trashed = false"];
  if (search) clauses.push(`name contains '${search.replace(/'/g, "\\'")}'`);
  if (folderId) clauses.push(`'${folderId.replace(/'/g, "\\'")}' in parents`);
  const params = new URLSearchParams({
    q: clauses.join(" and "),
    pageSize: "50",
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)",
  });
  const data = await drive(userId, `/drive/v3/files?${params.toString()}`);
  return (data.files ?? []) as DriveFile[];
}

/** Export a Google Sheet as XLSX and flatten EVERY tab into CSV text. */
async function readSpreadsheetAllTabs(userId: string, fileId: string) {
  const res = await driveFetch(
    userId,
    `/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
  );
  if (!res.ok) throw new Error(`Sheets export failed [${res.status}]: ${await res.text()}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return extractSpreadsheetText(buf);
}

export async function readFile(userId: string, fileId: string) {
  const meta = (await drive(
    userId,
    `/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`,
  )) as DriveFile;

  const mime = meta.mimeType || "";
  const isSheet =
    mime === "application/vnd.google-apps.spreadsheet" ||
    SPREADSHEET_MIME.test(mime) ||
    SPREADSHEET_EXT.test(meta.name || "");

  if (isSheet) {
    if (mime === "application/vnd.google-apps.spreadsheet") {
      const content = await readSpreadsheetAllTabs(userId, fileId);
      return { ...meta, content: content.slice(0, 200_000) };
    }
    // Uploaded xlsx/xls — download raw bytes and parse all sheets.
    const raw = await driveFetch(userId, `/drive/v3/files/${fileId}?alt=media`);
    if (!raw.ok) throw new Error(`Google Drive read failed [${raw.status}]: ${await raw.text()}`);
    const content = await extractSpreadsheetText(new Uint8Array(await raw.arrayBuffer()));
    return { ...meta, content };
  }

  const isGoogleDoc = mime.startsWith("application/vnd.google-apps");
  const path = isGoogleDoc
    ? `/drive/v3/files/${fileId}/export?mimeType=text/plain`
    : `/drive/v3/files/${fileId}?alt=media`;
  const res = await driveFetch(userId, path);
  const body = await res.text();
  if (!res.ok) throw new Error(`Google Drive read failed [${res.status}]: ${body}`);
  return { ...meta, content: body.slice(0, 200_000) };
}


/** Drive credentials are always personal and never borrowed from teammates. */
export async function resolveDriveUserId(userId: string, _teamspaceId?: string | null) {
  return (await getConnectionKeyForUser(userId, CONNECTOR_ID)) ? userId : null;
}

export async function createFolder(userId: string, name: string, parentId?: string) {
  return (await drive(userId, "/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as DriveFile;
}

export async function createDoc(userId: string, name: string, parentId?: string) {
  return (await drive(userId, "/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.document",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })) as DriveFile;
}

export async function renameFile(userId: string, fileId: string, name: string) {
  return (await drive(userId, `/drive/v3/files/${fileId}?fields=id,name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })) as DriveFile;
}

export async function moveFile(
  userId: string,
  fileId: string,
  targetFolderId: string,
  removeParents?: string,
) {
  const params = new URLSearchParams({
    addParents: targetFolderId,
    fields: "id,name,parents",
  });
  if (removeParents) params.set("removeParents", removeParents);
  return (await drive(userId, `/drive/v3/files/${fileId}?${params.toString()}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })) as DriveFile;
}

export async function disconnect(userId: string) {
  const key = await getConnectionKeyForUser(userId, CONNECTOR_ID);
  if (key) {
    try {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
      });
    } catch {
      /* remove local record even if the gateway already dropped it */
    }
  }
  await deleteConnectionForUser(userId, CONNECTOR_ID);
  return { ok: true };
}

/** Create a Google Doc directly, optionally with initial text content. */
export async function createDocWithContent(
  userId: string,
  name: string,
  content?: string,
  parentId?: string,
) {
  if (!content || !content.trim()) return createDoc(userId, name, parentId);

  const boundary = `vsb${Math.random().toString(36).slice(2)}`;
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.document",
    ...(parentId ? { parents: [parentId] } : {}),
  };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${content}\r\n--${boundary}--`;

  const res = await driveFetch(
    userId,
    "/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );

  const text = await res.text();
  if (!res.ok) throw new Error(`Google Docs create failed [${res.status}]: ${text}`);
  return JSON.parse(text) as DriveFile;
}

/** Return the caller only when that caller connected Drive. */
export async function effectiveDriveUserId(userId: string) {
  return resolveDriveUserId(userId);
}

/** Personal connection status. */
export async function sharedConnectionStatus(userId: string) {
  const own = await connectionStatus(userId);
  return { ...own, shared: false as const };
}
