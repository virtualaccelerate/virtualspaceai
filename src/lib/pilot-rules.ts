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

export function canChangePilotItem(manager: boolean, item: number, checked: boolean) {
  return Number.isInteger(item) && item >= 1 && item <= 15 && (manager || (item <= 10 && checked));
}

export function pilotPassed(items: Iterable<number>) {
  const checked = new Set(items);
  const block = (start: number) => Array.from({ length: 5 }, (_, i) => start + i).every(i => checked.has(i));
  return block(1) && (block(6) || block(11));
}