import type { GroupResources } from "./merge";
// Labels for task notifications in the bell; message text itself comes from src/lib/task-notice.ts.
const w = (openTask: string) => ({ app: { notifications: { openTask } } });
export default {
  ru: w("Открыть задачу"), en: w("Open task"), ky: w("Тапшырманы ачуу"),
  kk: w("Тапсырманы ашу"), uz: w("Vazifani ochish"), tg: w("Кушодани вазифа"),
} satisfies GroupResources;
