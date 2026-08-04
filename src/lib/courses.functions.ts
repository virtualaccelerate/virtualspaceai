import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type CourseRow = {
  id: string;
  title: string;
  title_ru: string | null;
  description: string;
  description_ru: string | null;
  cover_url: string | null;
  price: number;
  currency: string;
  level: string;
  duration: string;
  lessons_count: number;
  finik_payment_url: string | null;
  position: number;
  published: boolean;
};

export const COURSE_COLUMNS =
  "id, title, title_ru, description, description_ru, cover_url, price, currency, level, duration, lessons_count, finik_payment_url, position, published";

export type PurchaseStatus = "pending" | "paid" | "failed";

export type PurchaseRow = {
  id: string;
  course_id: string;
  amount: number;
  currency: string;
  status: PurchaseStatus;
  provider_ref: string | null;
  created_at: string;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listCourses = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("courses")
    .select(COURSE_COLUMNS)
    .eq("published", true)
    .order("position", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[courses] list failed", error.message);
    return [] as CourseRow[];
  }
  return (data ?? []) as unknown as CourseRow[];
});

/** Purchases of the signed-in user (course_id -> status). */
export const myPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("course_purchases")
      .select("id, course_id, amount, currency, status, provider_ref, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[courses] purchases failed", error.message);
      return [] as PurchaseRow[];
    }
    return (data ?? []) as unknown as PurchaseRow[];
  });

/**
 * Starts a purchase: creates (or reuses) a pending purchase row and returns
 * the Finik payment link the user has to complete.
 */
export const startCoursePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, price, currency, finik_payment_url, published")
      .eq("id", data.courseId)
      .maybeSingle();

    if (courseErr) throw new Error(courseErr.message);
    if (!course || !course.published) throw new Error("Course not found");

    const { data: existing } = await supabaseAdmin
      .from("course_purchases")
      .select("id, status")
      .eq("course_id", course.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing?.status === "paid") {
      return { status: "paid" as const, paymentUrl: null, purchaseId: existing.id };
    }

    let purchaseId = existing?.id ?? null;
    if (!purchaseId) {
      const { data: created, error } = await supabaseAdmin
        .from("course_purchases")
        .insert({
          course_id: course.id,
          user_id: context.userId,
          email: (context.claims as { email?: string } | null)?.email ?? null,
          amount: course.price,
          currency: course.currency,
          status: "pending",
          provider: "finik",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      purchaseId = created.id;
    }

    return {
      status: "pending" as const,
      purchaseId,
      paymentUrl: course.finik_payment_url ?? null,
    };
  });

/** Private video link — returned only when the caller has a paid purchase. */
export const getCourseVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ courseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: purchase } = await supabaseAdmin
      .from("course_purchases")
      .select("id")
      .eq("course_id", data.courseId)
      .eq("user_id", context.userId)
      .eq("status", "paid")
      .maybeSingle();

    if (!purchase) return { videoUrl: null as string | null };

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("video_url")
      .eq("id", data.courseId)
      .maybeSingle();

    return { videoUrl: (course?.video_url as string | null) ?? null };
  });

export const courseInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  title_ru: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(4000).default(""),
  description_ru: z.string().trim().max(4000).optional().nullable(),
  cover_url: z.string().trim().max(600).optional().nullable(),
  price: z.number().min(0).max(10_000_000).default(0),
  currency: z.string().trim().max(8).default("KGS"),
  level: z.string().trim().max(80).default(""),
  duration: z.string().trim().max(80).default(""),
  lessons_count: z.number().int().min(0).max(999).default(0),
  video_url: z.string().trim().max(600).optional().nullable(),
  finik_payment_url: z.string().trim().max(600).optional().nullable(),
  position: z.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

export type CourseInput = z.infer<typeof courseInputSchema>;
