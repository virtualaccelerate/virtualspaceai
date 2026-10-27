/** Hide leaked identifiers without changing stored task data. */
export function taskLabelDisplay(value: string | null | undefined): string | null {
  const label = value?.trim().replace(/^[|\s]+/, "").trim();
  if (!label || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label)) return null;
  return label;
}