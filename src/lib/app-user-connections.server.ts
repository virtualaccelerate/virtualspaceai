/** Server-only storage for per-user connector credentials. */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function cryptoKey(): Buffer {
  const raw = process.env['APP_USER_CONNECTION_KEY_SECRET'];
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return Buffer.from(raw, "base64");
}

export function encryptConnectionKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptConnectionKey(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", cryptoKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

const TABLE = "app_user_connections";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Table is not in the generated types yet.
  return supabaseAdmin as unknown as {
    from: (t: string) => any;
  };
}

export async function saveConnectionKeyForUser(
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
  accountEmail?: string | null,
) {
  const db = await admin();
  const { error } = await db.from(TABLE).upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
      account_email: accountEmail ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw error;
}

export async function getConnectionKeyForUser(userId: string, connectorId: string) {
  const db = await admin();
  const { data, error } = await db
    .from(TABLE)
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  return data ? decryptConnectionKey(data.connection_key_ciphertext) : null;
}

export async function getConnectionRowForUser(userId: string, connectorId: string) {
  const db = await admin();
  const { data, error } = await db
    .from(TABLE)
    .select("account_email, updated_at")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw error;
  return data as { account_email: string | null; updated_at: string } | null;
}

export async function setConnectionEmail(userId: string, connectorId: string, email: string) {
  const db = await admin();
  await db
    .from(TABLE)
    .update({ account_email: email })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}

export async function deleteConnectionForUser(userId: string, connectorId: string) {
  const db = await admin();
  const { error } = await db
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
  if (error) throw error;
}
