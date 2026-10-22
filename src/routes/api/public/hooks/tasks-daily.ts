import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

/** Daily briefs only; tracker synchronization belongs to the five-minute job. */
export const Route = createFileRoute('/api/public/hooks/tasks-daily')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-cron-secret') ?? '';
        if (!provided) return new Response('Unauthorized', { status: 401 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: setting } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'cron_secret').maybeSingle();
        const expected = setting?.value ?? process.env['CRON_SECRET'];
        if (!expected || provided !== expected) return new Response('Unauthorized', { status: 401 });
        const parsed = z.object({
          pass: z.enum(['pulse', 'morning', 'evening']).optional(),
          force: z.boolean().optional(), jobId: z.string().uuid().optional(),
          teamspaceId: z.string().uuid().optional(),
        }).strict().safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 });
        const body = parsed.data;
        const { enqueueNotificationPass, processNotificationJob } = await import('@/lib/notification-jobs.server');
        const waitUntil = (request as Request & { waitUntil?: (promise: Promise<unknown>) => void }).waitUntil;
        if (body.jobId) {
          const work = processNotificationJob(body.jobId);
          if (waitUntil) waitUntil.call(request, work);
          else await work; // Development/non-Worker fallback is awaited, never untracked.
          return Response.json({ ok: true, accepted: true }, { status: 202 });
        }
        // Independent of AI access pauses; every hourly callback runs local reminders.
        const reminders = import('@/lib/task-flow.server')
          .then(m => m.runDeadlineReminders())
          .catch(error => console.error('[deadline-reminders]', error));
        if (waitUntil) waitUntil.call(request, reminders);
        else await reminders;
        const now = new Date();
        const day = new Date(now.getTime() + 6 * 3600_000).getUTCDay();
        const scheduled = now.getUTCHours() === 4 ? 'morning' : now.getUTCHours() === 12 ? 'evening' : null;
        const pass = body.pass ?? (day !== 0 && day !== 6 ? scheduled : null);
        if (!pass) return Response.json({ ok: true, skipped: day === 0 || day === 6 ? 'weekend' : 'not-a-brief-hour' });
        const result = await enqueueNotificationPass(pass, body.force ?? false, body.teamspaceId);
        // Durable dispatcher gives each workspace its own background invocation.
        // A lost/cut-off invocation is recovered from its lease, not a whole-pass replay.
        return Response.json({ ok: true, pass, ...result }, { status: 202 });
      },
    },
  },
});
