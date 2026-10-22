const UNAVAILABLE = "YouGile временно недоступен. Сохранённые данные не изменены; повторите синхронизацию позже";
export class YouGileRequestError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

/** One invocation owns its timers and budget; never await another invocation's promise. */
export function createYouGileRequest(options: {
  budgetMs?: number; requestMs?: number; fetch?: typeof fetch;
} = {}) {
  const deadline = Date.now() + (options.budgetMs ?? 12_000);
  const transport = options.fetch ?? fetch;
  let lastCall = 0;
  function check() {
    if (Date.now() >= deadline) throw new YouGileRequestError(UNAVAILABLE);
  }
  async function wait(ms: number) {
    check();
    if (Date.now() + ms >= deadline) throw new YouGileRequestError(UNAVAILABLE);
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
    check();
  }
  async function request<T>(key: string, path: string, init?: RequestInit): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await wait(Math.max(0, lastCall + 150 - Date.now()));
      lastCall = Date.now();
      const controller = new AbortController();
      const timeoutMs = Math.min(options.requestMs ?? 3_000, deadline - Date.now());
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          (async () => {
            const response = await transport(`https://yougile.com/api-v2${path}`, {
              ...init, signal: controller.signal,
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
            });
            const text = await response.text();
            return { response, text };
          })(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new YouGileRequestError(UNAVAILABLE));
            }, timeoutMs);
          }),
        ]);
        const { response, text } = result;
        if (response.ok) return (text ? JSON.parse(text) : null) as T;
        console.error(`[yougile] ${path} failed [${response.status}]: ${text.slice(0, 200)}`);
        if (response.status === 401 || response.status === 403) throw new YouGileRequestError("YouGile отклонил API-ключ", response.status);
        if (response.status === 404) throw new YouGileRequestError("Объект YouGile не найден", 404);
        if (response.status !== 429 && response.status < 500) throw new YouGileRequestError(`YouGile недоступен (${response.status})`, response.status);
        if (attempt === 2) throw new YouGileRequestError(UNAVAILABLE, response.status);
        // Close this attempt before waiting; a stale timer must not interrupt backoff.
        clearTimeout(timer);
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        const date = retryAfter ? Date.parse(retryAfter) : NaN;
        const delay = Number.isFinite(seconds) ? seconds * 1000 : Number.isFinite(date) ? Math.max(0, date - Date.now()) : 800 * 2 ** attempt;
        await wait(Math.max(150, delay));
      } catch (error) {
        if (error instanceof YouGileRequestError) throw error;
        throw new YouGileRequestError(UNAVAILABLE);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new YouGileRequestError(UNAVAILABLE);
  }
  return { request, check };
}
export type YouGileRequest = ReturnType<typeof createYouGileRequest>;