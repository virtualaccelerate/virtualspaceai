import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type MentorRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  role_title: string;
  company: string;
  short_bio: string;
  full_bio: string;
  experience: string;
  achievements: string;
  topics: string;
  expertise: string[];
  industries: string[];
  languages: string[];
  hourly_rate: number | null;
  currency: string;
  booking_url: string | null;
  position: number;
  published: boolean;
};

export const MENTOR_COLUMNS =
  "id, full_name, photo_url, role_title, company, short_bio, full_bio, experience, achievements, topics, expertise, industries, languages, hourly_rate, currency, booking_url, position, published";

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

export const listMentors = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("mentors")
    .select(MENTOR_COLUMNS)
    .eq("published", true)
    .order("position", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[mentors] list failed", error.message);
    return [] as MentorRow[];
  }
  return (data ?? []) as MentorRow[];
});

export const getMentor = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("mentors")
      .select(MENTOR_COLUMNS)
      .eq("id", data.id)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      console.error("[mentors] get failed", error.message);
      return null;
    }
    return (row ?? null) as MentorRow | null;
  });

export const mentorInputSchema = z.object({
  full_name: z.string().trim().min(1).max(160),
  photo_url: z.string().trim().max(600).optional().nullable(),
  role_title: z.string().trim().max(200).default(""),
  company: z.string().trim().max(200).default(""),
  short_bio: z.string().trim().max(800).default(""),
  full_bio: z.string().trim().max(6000).default(""),
  experience: z.string().trim().max(6000).default(""),
  achievements: z.string().trim().max(6000).default(""),
  topics: z.string().trim().max(6000).default(""),
  expertise: z.array(z.string().trim().max(60)).max(20).default([]),
  industries: z.array(z.string().trim().max(60)).max(20).default([]),
  languages: z.array(z.string().trim().max(40)).max(12).default([]),
  hourly_rate: z.number().min(0).max(100000).optional().nullable(),
  currency: z.string().trim().max(8).default("USD"),
  booking_url: z.string().trim().max(600).optional().nullable(),
  position: z.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

export type MentorInput = z.infer<typeof mentorInputSchema>;
