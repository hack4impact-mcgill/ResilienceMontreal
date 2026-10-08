import type { RouterOutputs } from "@/trpc/react";

export type DbGrant =
  RouterOutputs["grant"]["getGrants"]["grants"][number];
export type FundPool = RouterOutputs["fundPool"]["getAll"][number];

export type DeadlineGrant = {
  id: number;
  title: string;
  description: string;
  start: Date;
  deadline: Date;
  total: number;
  spent: number;
  poolId?: number;
  poolName: string;
  poolOrder: number;
};

/**
 * Pool → bar colour. Hex codes are TBD in RM-145; keep them in one place
 * so design can update without touching the chart.
 */
export const POOL_COLORS: Record<string, string> = {
  Housing: "#3FA9A9",
  Furniture: "#F8D655",
  Clothing: "#3789E1",
};

export const FALLBACK_POOL_COLORS = [
  "#D062E6",
  "#67B95B",
  "#EFAC41",
  "#85A1A7",
  "#B03B40",
];

export const PROGRESS_COLOR = "#67B95B";

export function poolColor(poolName: string, poolIndex: number): string {
  return (
    POOL_COLORS[poolName] ??
    FALLBACK_POOL_COLORS[poolIndex % FALLBACK_POOL_COLORS.length]
  );
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toString" in (value as object)) {
    return Number((value as { toString(): string }).toString());
  }
  return Number(value);
}

function parseMeta(description: unknown): Record<string, unknown> {
  if (typeof description !== "string" || !description) return {};
  try {
    return JSON.parse(description) as Record<string, unknown>;
  } catch {
    return { notes: description };
  }
}

function toDate(value: unknown, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function toDeadlineGrants(
  grants: DbGrant[],
  pools: FundPool[],
): DeadlineGrant[] {
  const poolOrderById = new Map(pools.map((p) => [p.id, p.order ?? 0]));
  const poolNameById = new Map(pools.map((p) => [p.id, p.category]));

  return grants.map((g) => {
    const meta = parseMeta(g.description);
    const createdAt = new Date(g.createdAt);
    const start = toDate(meta.dateReceived, createdAt);
    const rawDeadline =
      (meta.toBeUsedBy as string | undefined) ?? g.endDate ?? g.createdAt;
    const deadline = toDate(rawDeadline, createdAt);

    const distributions = g.distributions ?? [];
    const total = distributions.length
      ? distributions.reduce((sum, d) => sum + toNumber(d.amount), 0)
      : toNumber(g.totalAmount);
    const spent = distributions.reduce(
      (sum, d) => sum + toNumber(d.spentAmount),
      0,
    );

    const firstPoolId =
      distributions[0]?.fundPool?.id ?? distributions[0]?.fundPoolId ?? undefined;
    const poolName =
      distributions[0]?.fundPool?.category ??
      (firstPoolId !== undefined ? poolNameById.get(firstPoolId) : undefined) ??
      String(meta.category ?? "Uncategorized");

    return {
      id: g.id,
      title: g.title,
      description: String(meta.notes ?? ""),
      start,
      deadline,
      total,
      spent,
      poolId: firstPoolId,
      poolName,
      poolOrder:
        firstPoolId !== undefined
          ? (poolOrderById.get(firstPoolId) ?? Number.MAX_SAFE_INTEGER)
          : Number.MAX_SAFE_INTEGER,
    };
  });
}

export function sortDeadlineGrants(grants: DeadlineGrant[]): DeadlineGrant[] {
  return [...grants].sort(
    (a, b) => a.poolOrder - b.poolOrder || a.deadline.getTime() - b.deadline.getTime(),
  );
}

export type TimeDomain = { min: Date; max: Date };

/**
 * Fixed Jan–Dec domain for a calendar year, matching the RM-145 mockup
 * (X axis always shows Jan through Dec).
 */
export function getYearDomain(year: number): TimeDomain {
  return { min: new Date(year, 0, 1), max: new Date(year + 1, 0, 1) };
}

export function getTimeDomain(grants: DeadlineGrant[]): TimeDomain | null {
  const withDates = grants.filter(
    (g) => !Number.isNaN(g.start.getTime()) && !Number.isNaN(g.deadline.getTime()),
  );
  if (withDates.length === 0) return null;
  let min = withDates[0].start.getTime();
  let max = withDates[0].deadline.getTime();
  for (const g of withDates) {
    min = Math.min(min, g.start.getTime());
    max = Math.max(max, g.deadline.getTime());
  }
  if (max <= min) max = min + 30 * 24 * 60 * 60 * 1000;
  const minDate = new Date(min);
  minDate.setDate(1);
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(max);
  maxDate.setMonth(maxDate.getMonth() + 1, 1);
  maxDate.setHours(0, 0, 0, 0);
  return { min: minDate, max: maxDate };
}

export function monthTicks(domain: TimeDomain): Date[] {
  const ticks: Date[] = [];
  const cursor = new Date(domain.min);
  while (cursor < domain.max) {
    ticks.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

export function toPct(value: number, min: number, max: number): number {
  if (!(max > min)) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function barPosition(
  start: Date,
  deadline: Date,
  domain: TimeDomain,
): { leftPct: number; widthPct: number } {
  const min = domain.min.getTime();
  const max = domain.max.getTime();
  const leftPct = toPct(start.getTime(), min, max);
  const rightPct = toPct(deadline.getTime(), min, max);
  return { leftPct, widthPct: Math.max(1.5, rightPct - leftPct) };
}

export function progressPct(spent: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.min(100, Math.max(0, (spent / total) * 100));
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function formatDeadline(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
