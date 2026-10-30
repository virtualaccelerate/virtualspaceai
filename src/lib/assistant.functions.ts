import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ts = z.object({ teamspace_id: z.string().uuid() });
const tabMap = z.object({ header_row: z.number().int().min(0) }).catchall(z.number().int());

export const getMyAssistant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => ts.parse(r))
  .handler(async ({ data, context }) => (await import("./assistant.server")).getAssistant(context.userId, data.teamspace_id));

export const saveMyAssistant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => ts.extend({ name: z.string().min(1).max(40), skills: z.array(z.string().max(40)).max(10) }).parse(r))
  .handler(async ({ data, context }) => (await import("./assistant.server")).saveAssistant(context.userId, data.teamspace_id, data));

export const proposeReminderSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => ts.extend({ sheet_url: z.string().url().max(1000) }).parse(r))
  .handler(async ({ data, context }) => (await import("./assistant.server")).proposeSource(context.userId, data.teamspace_id, data.sheet_url));

export const saveReminderSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => ts.extend({
    id: z.string().uuid().optional(), sheet_url: z.string().url().max(1000), title: z.string().max(300).optional(),
    tabs: z.array(z.string().max(200)).max(200), column_map: z.record(z.string(), tabMap), enabled: z.boolean().optional(),
  }).parse(r))
  .handler(async ({ data, context }) => (await import("./assistant.server")).saveSource(context.userId, data.teamspace_id, data));

export const deleteReminderSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => z.object({ id: z.string().uuid() }).parse(r))
  .handler(async ({ data, context }) => { await (await import("./assistant.server")).deleteSource(context.userId, data.id); return { ok: true }; });

export const previewClientReminders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((r: unknown) => ts.extend({ source_id: z.string().uuid().optional() }).parse(r))
  .handler(async ({ data, context }) => (await import("./assistant.server")).previewReminders(context.userId, data.teamspace_id, data.source_id));
