export function orderedValues(
  rows: { value: string; position: number }[],
): string[] {
  return [...rows].sort((a, b) => a.position - b.position).map((r) => r.value);
}
