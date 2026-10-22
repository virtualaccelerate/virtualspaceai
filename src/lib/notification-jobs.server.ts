import { bishkekDate, runAiNotifications, type NotifyPass } from './ai-notify.server';

export async function enqueueNotificationPass(pass: NotifyPass, force = false, onlyTeamspaceId?: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const { data: spaces, error } = onlyTeamspaceId
    ? await db.from('teamspaces').select('id').eq('id', onlyTeamspaceId)
    : await db.from('teamspaces').select('id').limit(200);
  if (error) throw error;
  const rows = (spaces ?? []).map(s => ({ teamspace_id: s.id, pass, day: bishkekDate(), force }));
  for (const row of rows) {
    const { error: insertError } = await db.from('notification_jobs').insert(row);
    if (insertError && insertError.code !== '23505') throw insertError;
  }
  return { queued: rows.length };
}

/** One workspace per invocation; durable leases/progress survive caller disconnects. */
export async function processNotificationJob(id: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const token = crypto.randomUUID();
  const { data, error } = await db.rpc('claim_notification_job', { _id: id, _token: token });
  if (error) throw error;
  const job = data?.[0];
  if (!job) return;
  try {
    await runAiNotifications(job.pass as NotifyPass, job.teamspace_id, { ignoreDedupe: job.force });
    if (job.pass === 'morning') {
      const { runOverdueRescheduleOffers } = await import('./task-flow.server');
      await runOverdueRescheduleOffers(job.teamspace_id).catch(e => console.error('[daily-reschedule]', e));
    }
    await db.from('notification_jobs').update({ status: 'done', finished_at: new Date().toISOString(), lease_until: null }).eq('id', id).eq('lease_token', token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const terminal = /^(400|401|402|403|404):|^AI_REFUSAL:|^AI_CONFIGURATION:/.test(message);
    await db.from('notification_jobs').update({ status: terminal || job.attempts >= 5 ? 'failed' : 'pending', error: message, lease_until: null }).eq('id', id).eq('lease_token', token);
    console.error('[daily-brief]', id, message);
  }
}
