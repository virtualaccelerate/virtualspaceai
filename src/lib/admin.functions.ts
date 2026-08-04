import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { startupInputSchema, type StartupRow } from "@/lib/startups.functions";
import { z } from "zod";


type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET!,
    name: "vs-admin",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const user = process.env.ADMIN_USERNAME;
    const pass = process.env.ADMIN_PASSWORD;
    if (!user || !pass) throw new Error("Admin credentials are not configured");

    const ok = matches(data.username.trim(), user) && matches(data.password, pass);
    if (!ok) return { ok: false as const };

    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminSessionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { authed: session.data.admin === true };
});

export type DemoRequestRow = {
  id: string;
  name: string;
  contact: string;
  company: string | null;
  language: string | null;
  created_at: string;
};

export const adminGetDemoRequests = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.admin) throw new Error("Unauthorized");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("demo_requests")
    .select("id, name, contact, company, language, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as DemoRequestRow[];
});
