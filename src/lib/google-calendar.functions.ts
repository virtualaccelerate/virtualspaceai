import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startGoogleCalendarConnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const request = getRequest();
  if (!request) throw new Error("OAuth must start from an app request");
  const { startConnect } = await import("./google-calendar.server");
  return startConnect(context.userId, new URL(request.url).origin);
});
export const completeGoogleCalendarConnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ code: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => (await import("./google-calendar.server")).completeConnect(context.userId, data.code));
export const googleCalendarStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./google-calendar.server")).status(context.userId));
export const googleCalendarList = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./google-calendar.server")).listCalendars(context.userId));
export const googleCalendarSelect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ calendarId: z.string().min(1).max(1000), name: z.string().min(1).max(300) }).parse(raw))
  .handler(async ({ data, context }) => (await import("./google-calendar.server")).selectCalendar(context.userId, data.calendarId, data.name));
export const googleCalendarSync = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./google-calendar.server")).syncUserCalendar(context.userId));
export const googleCalendarDisconnect = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./google-calendar.server")).disconnect(context.userId));
export const createGoogleCalendarMeeting = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ title: z.string().trim().min(1).max(300), start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }), description: z.string().max(4000).optional(), attendees: z.array(z.string().email()).max(50).optional() }).refine((x) => new Date(x.end) > new Date(x.start), "Meeting end must be after start").parse(raw))
  .handler(async ({ data, context }) => (await import("./google-calendar.server")).createMeeting(context.userId, data));
