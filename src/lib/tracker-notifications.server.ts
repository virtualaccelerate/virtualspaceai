export type TrackerNotice = {
  userId: string; teamspaceId: string; taskId: string; tracker: string;
  title: string; body: string; kind: string; actorId?: string; actorName?: string | null;
};
export type TrackerBatch = TrackerNotice[];
export async function flushTrackerNotifications(items: TrackerBatch, opts?: { skipTelegram?: boolean }) {
  if (!items.length) return [];
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data, error } = await supabaseAdmin.rpc('deliver_tracker_notifications', { _items: items });
  if (error) throw new Error(error.message);
  const delivered = data as unknown as { user_id: string; title: string; body: string; task_id: string | null }[];
  if (!opts?.skipTelegram) {
    const { notifyUserMessage } = await import('./telegram.server');
    for (const notice of delivered) await notifyUserMessage(notice.user_id, `${notice.title}\n${notice.body}`).catch(e => console.error('[tracker-notify] delivery failed', e));
  }
  return delivered;
}
