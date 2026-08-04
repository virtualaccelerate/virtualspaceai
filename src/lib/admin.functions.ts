import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { startupInputSchema, type StartupRow } from "@/lib/startups.functions";
import { mentorInputSchema, type MentorRow } from "@/lib/mentors.functions";
import { courseInputSchema, type CourseRow } from "@/lib/courses.functions";
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

const STARTUP_COLUMNS =
  "id, name, description, description_ru, image_url, website_url, cta_label, tags, position, published";

async function isAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  return session.data.admin === true;
}

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export const adminListStartups = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdmin())) return [] as StartupRow[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("startups")
    .select(STARTUP_COLUMNS)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StartupRow[];
});

export const adminSaveStartup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().optional().nullable(), values: startupInputSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data.values,
      description_ru: data.values.description_ru || null,
      image_url: data.values.image_url || null,
      website_url: data.values.website_url || null,
      cta_label: data.values.cta_label || null,
    };
    const query = data.id
      ? supabaseAdmin.from("startups").update(payload).eq("id", data.id)
      : supabaseAdmin.from("startups").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteStartup = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("startups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminUploadStartupLogo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
        dataBase64: z.string().min(1).max(8_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (!data.contentType.startsWith("image/")) throw new Error("Можно загружать только изображения");

    const bytes = Buffer.from(data.dataBase64, "base64");
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Файл больше 5 МБ");

    const ext = (data.fileName.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("startup-logos")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    return { url: `/api/public/startup-logo/${path}` };
  });


// ---------------- Mentors ----------------

export const adminListMentors = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdmin())) return [] as MentorRow[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { MENTOR_COLUMNS } = await import("@/lib/mentors.functions");
  const { data, error } = await supabaseAdmin
    .from("mentors")
    .select(MENTOR_COLUMNS)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MentorRow[];
});

export const adminSaveMentor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().optional().nullable(), values: mentorInputSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data.values,
      photo_url: data.values.photo_url || null,
      booking_url: data.values.booking_url || null,
      hourly_rate: data.values.hourly_rate ?? null,
    };
    const query = data.id
      ? supabaseAdmin.from("mentors").update(payload).eq("id", data.id)
      : supabaseAdmin.from("mentors").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteMentor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("mentors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });


// ---------------- Courses ----------------

export type AdminCourseRow = CourseRow & { video_url: string | null };

export const adminListCourses = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdmin())) return [] as AdminCourseRow[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { COURSE_COLUMNS } = await import("@/lib/courses.functions");
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(`${COURSE_COLUMNS}, video_url`)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminCourseRow[];
});

export const adminSaveCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().optional().nullable(), values: courseInputSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      ...data.values,
      title_ru: data.values.title_ru || data.values.title,
      description_ru: data.values.description_ru || data.values.description,
      cover_url: data.values.cover_url || null,
      video_url: data.values.video_url || null,
      finik_payment_url: data.values.finik_payment_url || null,
    };
    const query = data.id
      ? supabaseAdmin.from("courses").update(payload).eq("id", data.id)
      : supabaseAdmin.from("courses").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export type AdminPurchaseRow = {
  id: string;
  course_id: string;
  email: string | null;
  amount: number;
  currency: string;
  status: string;
  provider_ref: string | null;
  paid_at: string | null;
  created_at: string;
};

export const adminListPurchases = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdmin())) return [] as PurchaseRow[];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("course_purchases")
    .select("id, course_id, email, amount, currency, status, provider_ref, paid_at, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPurchaseRow[];
});

export const adminSetPurchaseStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "paid", "failed"]) }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("course_purchases")
      .update({ status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
