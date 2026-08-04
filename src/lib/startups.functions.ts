import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type StartupRow = {
  id: string;
  name: string;
  description: string;
  description_ru: string | null;
  image_url: string | null;
  website_url: string | null;
  cta_label: string | null;
  tags: string[];
  position: number;
  published: boolean;
};

const COLUMNS =
  "id, name, description, description_ru, image_url, website_url, cta_label, tags, position, published";

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

export const listStartups = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("startups")
    .select(COLUMNS)
    .eq("published", true)
    .order("position", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[startups] list failed", error.message);
    return [] as StartupRow[];
  }
  return (data ?? []) as StartupRow[];
});

export const startupInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(600).default(""),
  description_ru: z.string().trim().max(600).optional().nullable(),
  image_url: z.string().trim().max(600).optional().nullable(),
  website_url: z.string().trim().max(600).optional().nullable(),
  cta_label: z.string().trim().max(80).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(8).default([]),
  position: z.number().int().min(0).max(999).default(0),
  published: z.boolean().default(true),
});

export type StartupInput = z.infer<typeof startupInputSchema>;
