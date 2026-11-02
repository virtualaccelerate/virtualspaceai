export type TrackerNotice = {
  userId: string; teamspaceId: string; taskId: string | null; tracker: string;
  title: string; body: string; kind: string; actorId?: string; actorName?: string | null;
  /** Detailed Telegram copy (HTML + buttons) from the shared task formatter. */
  html?: string; keyboard?: { inline_keyboard: { text: string; callback_data?: string; url?: string }[][] };
};
export type TrackerBatch = TrackerNotice[];
export async function flushTrackerNotifications(items: TrackerBatch, opts?: { skipTelegram?: boolean }) {
  if (!items.length) return [];
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const rows = items.map(({ html: _html, keyboard: _keyboard, ...rest }) => rest);
  const { data, error } = await supabaseAdmin.rpc('deliver_tracker_notifications', { _items: rows });
  if (error) throw new Error(error.message);
  const delivered = data as unknown as { user_id: string; title: string; body: string; task_id: string | null }[];
  if (!opts?.skipTelegram) {
    const { notifyUserMessage } = await import('./telegram.server');
    const rich = new Map(items.map((i) => [`${i.userId}|${i.taskId ?? ''}|${i.body}`, i]));
    for (const notice of delivered) {
      const source = rich.get(`${notice.user_id}|${notice.task_id ?? ''}|${notice.body}`);
      const send = source?.html
        ? notifyUserMessage(notice.user_id, source.html, { parse_mode: 'HTML', ...(source.keyboard ? { reply_markup: source.keyboard } : {}) })
        : notifyUserMessage(notice.user_id, `${notice.title}\n${notice.body}`);
      await send.catch(e => console.error('[tracker-notify] delivery failed', e));
    }
  }
  return delivered;
}
