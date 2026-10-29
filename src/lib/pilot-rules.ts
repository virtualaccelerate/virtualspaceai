export type PilotCheck = {
  item: number;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  checker_name: string | null;
  automatic: boolean;
  result_percent: number | null;
};
export type PilotState = { checks: PilotCheck[]; total: number; passed: boolean; isManager: boolean };

export const PILOT_TOTAL = 18;
export const PILOT_RESULT_ITEM = 13;
/** Six steps; step 5 (finance) is manager-only. */
export const PILOT_STEPS = [[1, 2, 3], [4, 5, 6], [7, 8, 9, 10], [11, 12, 13], [14, 15, 16], [17, 18]];
export const PILOT_AUTO = new Set([1, 2, 3, 4, 6, 7, 9, 11, 12, 13, 14, 15]);
export const isManagerOnlyItem = (item: number) => item >= 14 && item <= 16;

export function canChangePilotItem(manager: boolean, item: number, checked: boolean) {
  return Number.isInteger(item) && item >= 1 && item <= PILOT_TOTAL && (manager || (!isManagerOnlyItem(item) && checked));
}

/** Steps 1, 2, 3, 6 complete plus step 4 (onboarding) OR step 5 (finance). */
export function pilotPassed(items: Iterable<number>) {
  const checked = new Set(items);
  const step = (n: number) => PILOT_STEPS[n - 1].every(i => checked.has(i));
  return step(1) && step(2) && step(3) && step(6) && (step(4) || step(5));
}
