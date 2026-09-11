/**
 * Groups an array of rows by a key derived from each row.
 *
 * NOTE: This operates on the current page's data only.
 * If rows from the same group span multiple pages (e.g. 30 expenses from
 * "Pool A" across 2 pages), each page shows a partial group. For cross-page
 * complete grouping, a server-side GROUP BY endpoint is needed.
 */
export function groupRows<TRow, TKey extends string>(
  rows: TRow[],
  keyFn: (row: TRow) => TKey,
): Array<{ key: TKey; rows: TRow[] }> {
  const map = new Map<TKey, TRow[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = map.get(key);
    if (existing) {
      existing.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return Array.from(map.entries()).map(([key, rows]) => ({ key, rows }));
}
