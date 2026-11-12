// Grant metadata (category, dates, contact info, notes) is stored as JSON in
// Grant.description. Older rows may hold plain text, which is treated as notes.
export function parseGrantMeta(
  description: string | null | undefined,
): Record<string, unknown> {
  try {
    return description ? JSON.parse(description) : {};
  } catch {
    return { notes: description };
  }
}
