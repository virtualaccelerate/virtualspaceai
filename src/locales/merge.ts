export type LangBundle = Record<string, unknown>;
export type GroupResources = Record<string, LangBundle>;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  for (const [key, value] of Object.entries(source)) {
    const current = (target as Record<string, unknown>)[key];
    if (isObject(value) && isObject(current)) {
      deepMerge(current as Record<string, unknown>, value);
    } else {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}
