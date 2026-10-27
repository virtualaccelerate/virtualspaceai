const UNAVAILABLE = "YouGile временно недоступен. Сохранённые данные не изменены; повторите синхронизацию позже";
export const BUDGET_EXHAUSTED = "Синхронизация не успела завершиться, продолжим автоматически";
/** Background (cron/webhook) syncs may spend more YouGile HTTP time than interactive UI calls. */
export const BACKGROUND_BUDGET_MS = 50_000;
export class YouGileRequestError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

/**
 * One invocation owns its timers and budget; never await another invocation's promise.
 * The budget counts only time spent on YouGile HTTP (requests, throttle and backoff waits),
 * so local database writes between requests never consume it.
 */
export function createYouGileRequest(options: {
  budgetMs?: number; requestMs?: number; fetch?: typeof fetch;
} = {}) {
  const budget = options.budgetMs ?? 12_000;
  const transport = options.fetch ?? fetch;
  let lastCall = 0;
  let spent = 0;
  const left = () => budget - spent;
  function check() {
    if (left() <= 0) throw new YouGileRequestError(BUDGET_EXHAUSTED);
  }
  async function wait(ms: number) {
    check();
    if (ms >= left()) throw new YouGileRequestError(UNAVAILABLE);
    if (ms > 0) {
      const started = Date.now();
      await new Promise((resolve) => setTimeout(resolve, ms));
      spent += Date.now() - started;
    }
  }
  async function request<T>(key: string, path: string, init?: RequestInit): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await wait(Math.max(0, lastCall + 150 - Date.now()));
      lastCall = Date.now();
      const controller = new AbortController();
      check();
      const requestMs = options.requestMs ?? 3_000;
      const timeoutMs = Math.min(requestMs, left());
      // A request cut short by the remaining budget is "not finished yet", not an outage.
      const timeoutMessage = timeoutMs < requestMs ? BUDGET_EXHAUSTED : UNAVAILABLE;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const started = Date.now();
      let measured = false;
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
              reject(new YouGileRequestError(timeoutMessage));
            }, timeoutMs);
          }),
        ]);
        const { response, text } = result;
        spent += Date.now() - started;
        measured = true;
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
        if (!measured) spent += Date.now() - started;
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