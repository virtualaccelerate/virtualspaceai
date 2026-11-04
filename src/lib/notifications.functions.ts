import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listNotificationsForUser } = await import("./notifications.server");
    return listNotificationsForUser(context.userId);
  });

export const markNotificationsAsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { markNotificationsRead } = await import("./notifications.server");
    return markNotificationsRead(context.userId, data.ids);
  });

export const dismissNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { dismissNotifications: remove } = await import("./notifications.server");
    return remove(context.userId, data.ids);
  });
