import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { canChangePilotItem, type PilotState } from "./pilot-rules";

const workspace = z.object({ teamspace_id: z.string().uuid() });
export const loadPilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => workspace.parse(raw))
  .handler(async ({ data, context }): Promise<PilotState> => {
    const result = await context.supabase.rpc("load_pilot_checklist", { p_teamspace: data.teamspace_id });
    if (result.error) throw new Error("PILOT_LOAD_FAILED");
    return result.data as unknown as PilotState;
  });

export const updatePilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => workspace.extend({
    item: z.number().int().min(1).max(15), checked: z.boolean(),
    result_percent: z.number().min(0).max(100).nullable().optional(),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const membership = await context.supabase.from("teamspace_members").select("role")
      .eq("teamspace_id", data.teamspace_id).eq("user_id", context.userId).maybeSingle();
    const manager = membership.data?.role === "owner" || membership.data?.role === "admin";
    if (membership.error || !membership.data || !canChangePilotItem(manager, data.item, data.checked)) throw new Error("PILOT_FORBIDDEN");
    // Unchecked rows are retained, preventing evidence from immediately rechecking a manager's decision.
    const result = await context.supabase.from("pilot_checks").upsert({
      teamspace_id: data.teamspace_id, item: data.item, checked: data.checked,
      automatic: false, ...(data.item === 10 && data.result_percent !== undefined ? { result_percent: data.result_percent } : {}),
    }, { onConflict: "teamspace_id,item" });
    if (result.error) throw new Error("PILOT_SAVE_FAILED");
    return { ok: true };
  });