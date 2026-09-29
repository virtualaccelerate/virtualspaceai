import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAgentAutomations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { listAutomations } = await import("./agent-automation.server");
    return (await listAutomations(context.userId, data.teamspace_id)) as any[];
  });

export const cancelAgentAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { cancelAutomation } = await import("./agent-automation.server");
    return cancelAutomation(context.userId, data.id);
  });
