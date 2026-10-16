import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Keep both selections together: callers must never choose or replace a model.
export const STT_MODELS = { primary: 'openai/gpt-transcribe', fallback: 'google/gemini-3.8-flash' } as const;
type Input = { user_id: string; teamspace_id?: string | null; source: 'web' | 'telegram' | 'whatsapp'; audio: Uint8Array; mime_type: string; duration_ms?: number; language?: string; single_language?: boolean };
class SttError extends Error {
  constructor(message: string, public terminal = false, public status = 0) { super(message); }
}
export function normalizeSttMime(raw: string) {
  const base = raw.toLowerCase().split(';')[0].trim();
  if (['audio/oga', 'audio/opus', 'audio/x-opus+ogg', 'application/ogg', 'audio/ogg'].includes(base)) return { mime: 'audio/ogg', ext: 'ogg', format: 'ogg' };
  if (['audio/mp4', 'video/mp4', 'audio/x-m4a'].includes(base)) return { mime: 'audio/mp4', ext: 'mp4', format: 'm4a' };
  if (['audio/webm', 'video/webm'].includes(base)) return { mime: 'audio/webm', ext: 'webm', format: 'webm' };
  if (['audio/mpeg', 'audio/mp3'].includes(base)) return { mime: 'audio/mpeg', ext: 'mp3', format: 'mp3' };
  if (['audio/wav', 'audio/x-wav', 'audio/wave'].includes(base)) return { mime: 'audio/wav', ext: 'wav', format: 'wav' };
  if (['audio/aac', 'audio/flac'].includes(base)) return { mime: base, ext: base.slice(6), format: base.slice(6) };
  throw new SttError('Не поддерживается формат записи. Запишите голос ещё раз.', true);
}
export async function logSttAttempt(input: Omit<Input, 'audio'> & { bytes: number }, model: string, status: 'ok' | 'empty' | 'error', error?: string) {
  const { error: failure } = await supabaseAdmin.from('stt_log').insert({ user_id: input.user_id, teamspace_id: input.teamspace_id ?? null, source: input.source, mime_type: input.mime_type, bytes: input.bytes, duration_ms: input.duration_ms == null ? null : Math.round(input.duration_ms), model_used: model, status, error: error ?? null });
  if (failure) throw new SttError('Не удалось записать диагностику голосового ввода. Попробуйте позже.', true);
}
// Consume complete SSE frames, including split packets, metadata and empty deltas.
async function readTranscript(response: Response, chat: boolean) {
  if (!response.body) throw new SttError('Не удалось распознать речь. Попробуйте ещё раз.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', complete = false;
  const frame = (raw: string) => {
    const data = raw.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    if (data === '[DONE]') { complete = true; return; }
    const event = JSON.parse(data);
    if (event.error || event.type === 'error') {
      const code = event.error?.code ?? event.code;
      const denial = code === 'permission_error';
      const terminal = denial || ['content_policy_violation', 'refusal'].includes(code);
      throw new SttError(event.error?.message ?? event.message ?? 'Не удалось распознать речь.', terminal, denial ? 403 : 0);
    }
    if (chat) {
      const choice = event.choices?.[0];
      if (choice?.delta?.refusal || choice?.finish_reason === 'content_filter') throw new SttError('Модель отказалась обрабатывать эту запись.', true);
      text += choice?.delta?.content ?? '';
      if (choice?.finish_reason === 'stop') complete = true;
    } else {
      if (event.type === 'transcript.text.delta') text += event.delta ?? '';
      if (event.type === 'transcript.text.done') { text = event.text ?? text; complete = true; }
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) { frame(buffer.slice(0, end)); buffer = buffer.slice(end + 2); }
      if (done) break;
    }
    if (buffer.trim()) frame(buffer);
  } finally { await reader.cancel().catch(() => {}); }
  if (!complete) throw new SttError('Распознавание прервалось. Попробуйте ещё раз.');
  return text.trim();
}
async function checkResponse(res: Response, model: string) {
  if (res.ok) return;
  const body = await res.json().catch(() => ({})) as { message?: string; error?: { message?: string; type?: string }; type?: string };
  const safe = body.message ?? body.error?.message;
  const message = res.status === 401 ? 'Голосовой ввод не настроен: отсутствует или недействителен ключ AI.'
    : res.status === 429 ? 'Слишком много запросов. Подождите немного и повторите.'
    : res.status === 402 ? safe ?? 'AI-кредиты закончились. Пополните баланс в настройках.'
    : res.status === 403 ? safe ?? 'Доступ к распознаванию запрещён.'
    : res.status === 404 ? 'Модель распознавания сейчас недоступна.'
    : 'Не удалось распознать речь. Попробуйте ещё раз.';
  if (res.status === 402 || res.status === 403) {
    const { error } = await supabaseAdmin.from('stt_service_state').upsert({ model, reason: message, status: res.status });
    if (error) throw new SttError('Голосовой ввод приостановлен: не удалось сохранить состояние доступа.', true);
  }
  const terminal = [401, 402, 403, 404].includes(res.status) || (res.status >= 400 && res.status < 500 && ![400, 415, 429].includes(res.status));
  // Switching after a rejected audio format is a new, model-specific request, not a retry.
  if (res.status === 429 || res.status >= 500) {
    const retryAfter = res.headers.get('Retry-After');
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    const delay = Number.isFinite(seconds) ? seconds * 1000 : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.now()) : 1000 + Math.random() * 500;
    if (delay > 10000) throw new SttError(message, true, res.status);
    await new Promise(resolve => setTimeout(resolve, Math.max(1000, delay)));
  }
  const failure = new SttError(message, terminal, res.status);
  failure.name = `STT_HTTP_${res.status}`;
  throw failure;
}
export async function transcribeSpeech(input: Input, transport: typeof fetch = fetch) {
  const meta = { ...input, bytes: input.audio.byteLength };
  let type: ReturnType<typeof normalizeSttMime>;
  try {
    type = normalizeSttMime(input.mime_type);
    if (input.audio.byteLength < 512 || (input.duration_ms != null && input.duration_ms < 250)) throw new SttError('Запись слишком короткая. Говорите немного дольше.', true);
    if (input.audio.byteLength > 24 * 1024 * 1024 || (input.duration_ms != null && input.duration_ms > 300000)) throw new SttError('Запись слишком длинная. Максимум — 5 минут.', true);
    if (!process.env.LOVABLE_API_KEY) throw new SttError('Голосовой ввод не настроен: отсутствует ключ AI.', true);
  } catch (error) {
    await logSttAttempt(meta, STT_MODELS.primary, 'error', error instanceof Error ? error.message : 'Ошибка записи');
    throw error;
  }
  const { data: paused, error: stateError } = await supabaseAdmin.from('stt_service_state').select('reason').in('model', Object.values(STT_MODELS)).limit(1);
  if (stateError) throw new SttError('Не удалось проверить доступ к голосовому вводу.', true);
  if (paused?.length) { await logSttAttempt(meta, STT_MODELS.primary, 'error', paused[0].reason); throw new SttError(paused[0].reason, true); }
  const words = ['задача', 'дедлайн', 'назначь', 'исполнитель', 'Trello', 'YouGile', 'Telegram', 'Virtual Space'];
  if (input.teamspace_id) {
    const { data: membership } = await supabaseAdmin.from('teamspace_members').select('user_id').eq('teamspace_id', input.teamspace_id).eq('user_id', input.user_id).maybeSingle();
    if (!membership) throw new SttError('Нет доступа к этому пространству.', true);
    const { data: members } = await supabaseAdmin.from('teamspace_members').select('user_id').eq('teamspace_id', input.teamspace_id);
    const ids = (members ?? []).map(row => row.user_id);
    const [{ data: profiles }, { data: projects }] = await Promise.all([
      ids.length ? supabaseAdmin.from('profiles').select('full_name').in('id', ids) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('projects').select('name').eq('teamspace_id', input.teamspace_id).limit(50),
    ]);
    words.push(...(profiles ?? []).map(row => row.full_name ?? '').filter(Boolean), ...(projects ?? []).map(row => row.name));
  }
  const vocabulary = words.join(', ').slice(0, 4000);
  for (const [index, model] of Object.values(STT_MODELS).entries()) {
    try {
      let response: Response;
      if (index === 0) {
        const form = new FormData();
        form.append('model', model);
        form.append('file', new Blob([new Uint8Array(input.audio)], { type: type.mime }), `recording.${type.ext}`);
        form.append('stream', 'true'); form.append('response_format', 'json');
        // The gateway currently rejects multipart keywords/languages arrays (HTTP 400).
        // Keep these optional hints in the supported prompt instead of failing every first attempt.
        form.append('prompt', `Expected languages: ru, ky, en. Речь может смешивать русский, кыргызский и English. Сохраняй исходный язык и письменность, без перевода. Возможные слова и имена (не добавляй их, если их нет в записи): ${vocabulary}`);
        if (input.single_language && input.language && ['ru', 'ky', 'en'].includes(input.language)) form.append('language', input.language);
        response = await transport('https://ai.gateway.lovable.dev/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, 'X-Lovable-AIG-SDK': 'fetch' }, body: form });
      } else {
        response = await transport('https://ai.gateway.lovable.dev/v1/chat/completions', { method: 'POST', headers: { 'Lovable-API-Key': process.env.LOVABLE_API_KEY ?? '', 'X-Lovable-AIG-SDK': 'fetch', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, stream: true, messages: [{ role: 'user', content: [{ type: 'text', text: `Transcribe this recording exactly as spoken. It may mix Russian, Kyrgyz and English. Keep words in their original script. No translation, no commentary, no invented words. Return only the transcription; return empty if there is no speech. Possible vocabulary: ${vocabulary}` }, { type: 'input_audio', input_audio: { data: Buffer.from(input.audio).toString('base64'), format: type.format } }] }] }) });
      }
      await checkResponse(response, model);
      const text = await readTranscript(response, index === 1);
      await logSttAttempt({ ...meta, mime_type: type.mime }, model, text.length < 2 ? 'empty' : 'ok');
      if (text.length >= 2) return { text, model_used: model };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось распознать речь.';
      await logSttAttempt({ ...meta, mime_type: type.mime }, model, 'error', error instanceof SttError && error.status ? `HTTP ${error.status}: ${message}` : message);
      if (error instanceof SttError && error.terminal) {
        if (error.status === 403) await supabaseAdmin.from('stt_service_state').upsert({ model, reason: message, status: 403 });
        throw error;
      }
      if (index === 1) throw new SttError(message);
    }
  }
  throw new SttError('Не удалось распознать речь. Попробуйте говорить ближе к микрофону.');
}
