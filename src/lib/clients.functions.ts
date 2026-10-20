import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteClient, listClients, saveClient, scanTasks, setupClientDatabase, syncSheet, requireClientManager } from "./clients.server";

const Ts = z.object({ teamspace_id: z.string().uuid(), language: z.enum(["en", "ru", "kk", "ky", "uz", "tg"]).optional() });
const opt = (n: number) => z.string().max(n).nullable().optional();

export const listClientsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.parse(d))
  .handler(({ data, context }) => listClients(context.userId, data.teamspace_id));

export const saveClientFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.extend({
    id: z.string().uuid().optional(), name: z.string().max(200),
    phone: opt(60), email: opt(200), company: opt(200), notes: opt(2000), status: opt(60),
  }).parse(d))
  .handler(({ data, context }) => { const { teamspace_id, language, ...c } = data; return saveClient(context.userId, teamspace_id, c, language); });

export const deleteClientFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.extend({ id: z.string().uuid() }).parse(d))
  .handler(({ data, context }) => deleteClient(context.userId, data.teamspace_id, data.id, data.language));

export const scanClientTasksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.parse(d))
  .handler(({ data, context }) => scanTasks(context.userId, data.teamspace_id, data.language));

export const setupClientDbFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.parse(d))
  .handler(({ data, context }) => setupClientDatabase(context.userId, data.teamspace_id, data.language));

export const syncClientSheetFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Ts.parse(d))
  .handler(async ({ data, context }) => { await requireClientManager(context.userId, data.teamspace_id); return syncSheet(data.teamspace_id, context.userId, data.language); });
