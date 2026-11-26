// Splitting a grant over several fund pools by percentage. Percentages are
// worked in hundredths and amounts in cents so the parts always add up exactly.

export type SplitLine = { fundPoolId: string; percent: string };

const toHundredths = (percent: string) => Math.round(Number(percent) * 100);

/** "75" -> "75%", "33.333" -> "33.33%" */
export function formatPercent(percent: number): string {
  return `${Number(percent.toFixed(2))}%`;
}

/**
 * Cents for each line. Every line but the last is rounded; the last takes what
 * is left so the total is exact.
 */
export function splitCents(totalAmount: number, lines: SplitLine[]): number[] {
  const totalCents = Math.round(totalAmount * 100);
  const cents = lines.map((line) =>
    Math.round((totalCents * toHundredths(line.percent)) / 10000),
  );
  const allButLast = cents.slice(0, -1).reduce((sum, c) => sum + c, 0);
  cents[cents.length - 1] = totalCents - allButLast;
  return cents;
}

/** Why the split can't be saved, or null when it is valid. */
export function splitError(
  totalAmount: number,
  lines: SplitLine[],
): string | null {
  if (lines.length < 2) return "Add at least two categories to split a grant";
  if (lines.some((line) => !line.fundPoolId))
    return "Choose a category for each line";
  const poolIds = lines.map((line) => line.fundPoolId);
  if (new Set(poolIds).size !== poolIds.length)
    return "Each category can only be used once";
  if (
    lines.some((line) => {
      const p = Number(line.percent);
      return line.percent.trim() === "" || !(p > 0) || p > 100;
    })
  )
    return "Each percentage must be more than 0% and at most 100%";

  const sum = lines.reduce((acc, line) => acc + toHundredths(line.percent), 0);
  if (sum !== 10000)
    return `Percentages add up to ${formatPercent(sum / 100)}; they must add up to 100%`;

  if (!(totalAmount > 0)) return "Enter the grant amount to split it";
  if (splitCents(totalAmount, lines).some((c) => c <= 0))
    return "The amount is too small to split this way";
  return null;
}
