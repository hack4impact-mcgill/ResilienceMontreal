"use client";

import * as React from "react";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";

import { api } from "@/trpc/react";
import { GrantDeadlineDialog } from "./GrantDeadlineDialog";
import {
  barPosition,
  getTimelineDomain,
  monthTicks,
  poolColor,
  poolProgressColor,
  progressPct,
  sortDeadlineGrants,
  toDeadlineGrants,
} from "./deadlines-utils";

const LABEL_WIDTH_PX = 200;
const TIMELINE_INSET_PX = 8;
const ROW_HEIGHT_PX = 36;
const HEADER_HEIGHT_PX = 56;
const MONTH_WIDTH_PX = 96;

export function DeadlinesChart() {
  const grantsQuery = api.grant.getGrants.useQuery({
    limit: 100,
    status: "APPROVED",
  });
  const poolsQuery = api.fundPool.getAll.useQuery();
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (grantsQuery.error) {
      console.error("Failed to load grant deadlines:", grantsQuery.error);
    }
  }, [grantsQuery.error]);

  const grants = React.useMemo(() => {
    if (!grantsQuery.data?.grants) return [];
    return sortDeadlineGrants(
      toDeadlineGrants(grantsQuery.data.grants, poolsQuery.data ?? []),
    );
  }, [grantsQuery.data, poolsQuery.data]);

  const [currentYear] = React.useState(() => new Date().getFullYear());
  const [selectedYear, setSelectedYear] = React.useState(currentYear);
  const years = React.useMemo(
    () =>
      Array.from(new Set([2025, 2026, 2027, currentYear])).sort(
        (a, b) => a - b,
      ),
    [currentYear],
  );
  const [now] = React.useState(() => Date.now());
  const domain = React.useMemo(
    () => getTimelineDomain(selectedYear, grants),
    [selectedYear, grants],
  );
  const visibleGrants = React.useMemo(
    () =>
      grants.filter((g) => g.start < domain.max && g.deadline >= domain.min),
    [grants, domain],
  );
  const ticks = React.useMemo(
    () => (domain ? monthTicks(domain) : []),
    [domain],
  );

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ left: 0 });
  }, [selectedYear]);

  const poolOrder = React.useMemo(() => {
    const names: string[] = [];
    for (const g of grants) {
      if (!names.includes(g.poolName)) names.push(g.poolName);
    }
    return names;
  }, [grants]);

  const todayPct = React.useMemo(() => {
    if (!domain) return null;
    const min = domain.min.getTime();
    const max = domain.max.getTime();
    if (now < min || now > max) return null;
    return ((now - min) / (max - min)) * 100;
  }, [domain, now]);

  if (grantsQuery.isLoading || poolsQuery.isLoading) {
    return <TableLoadingState />;
  }

  if (grantsQuery.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load grant deadlines. Check your database connection and
        try again.
      </p>
    );
  }

  const selected = grants.find((g) => g.id === selectedId) ?? null;
  const min = domain.min.getTime();
  const max = domain.max.getTime();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <label className="flex items-center gap-2 self-start text-sm font-medium">
        Year
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={selectedYear}
          onChange={(event) => {
            setSelectedYear(Number(event.target.value));
            setSelectedId(null);
          }}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        {poolOrder.map((name, i) => (
          <span key={name} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: poolColor(name, i) }}
            />
            {name}
          </span>
        ))}
        <span className="text-sm text-muted-foreground">
          Darker shading shows spent (% of grant)
        </span>
      </div>

      <div
        ref={scrollRef}
        role="region"
        aria-label="Grant deadlines timeline"
        tabIndex={0}
        className="w-full overflow-x-auto rounded-lg border bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <div
          style={{
            minWidth:
              LABEL_WIDTH_PX +
              TIMELINE_INSET_PX * 2 +
              ticks.length * MONTH_WIDTH_PX,
          }}
        >
          <div
            className="flex border-b border-gray-300 bg-gray-50"
            style={{ height: HEADER_HEIGHT_PX }}
          >
            <div
              className="sticky left-0 z-20 flex shrink-0 items-center border-r border-gray-300 bg-gray-50 px-3 text-xs font-semibold uppercase text-gray-700"
              style={{
                width: LABEL_WIDTH_PX,
              }}
            >
              Grant
            </div>
            <div
              className="relative flex-1"
              style={{
                marginLeft: TIMELINE_INSET_PX,
                marginRight: TIMELINE_INSET_PX,
              }}
            >
              {ticks.map((t) => {
                const left = ((t.getTime() - min) / (max - min)) * 100;
                return (
                  <span
                    key={t.toISOString()}
                    className="absolute top-0 flex h-full flex-col justify-center whitespace-nowrap border-l border-gray-300 px-2 text-xs font-medium leading-5 text-gray-700"
                    style={{
                      left: `${left}%`,
                    }}
                  >
                    <span>
                      {t.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span>{t.getFullYear()}</span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative">
            {todayPct !== null && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-500"
                style={{
                  left: `calc(${LABEL_WIDTH_PX + TIMELINE_INSET_PX}px + (100% - ${LABEL_WIDTH_PX + TIMELINE_INSET_PX * 2}px) * ${todayPct / 100})`,
                }}
                title="Today"
              >
                <span className="absolute -top-1 -translate-x-1/2 rounded bg-red-500 px-1 text-[10px] text-white">
                  today
                </span>
              </div>
            )}
            {visibleGrants.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No grants with deadlines from {selectedYear} onward.
              </p>
            )}
            {visibleGrants.map((g) => {
              const { leftPct, widthPct } = barPosition(
                g.start,
                g.deadline,
                domain,
              );
              const poolIndex = Math.max(0, poolOrder.indexOf(g.poolName));
              const progress = progressPct(g.spent, g.total);
              return (
                <div
                  key={g.id}
                  className="flex items-center border-b last:border-0"
                  style={{ height: ROW_HEIGHT_PX }}
                >
                  <div
                    className="sticky left-0 z-20 flex h-full shrink-0 items-center border-r bg-white px-3 text-sm"
                    style={{ width: LABEL_WIDTH_PX }}
                    title={g.title}
                  >
                    <span className="truncate">{g.title}</span>
                  </div>
                  <div
                    className="relative h-full flex-1"
                    style={{
                      marginLeft: TIMELINE_INSET_PX,
                      marginRight: TIMELINE_INSET_PX,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className="absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: 4,
                        maxWidth: `${100 - leftPct}%`,
                        backgroundColor: poolColor(g.poolName, poolIndex),
                      }}
                      aria-label={`${g.title}, deadline ${g.deadline.toLocaleDateString()}. Show details.`}
                      title={g.title}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: poolProgressColor(
                            g.poolName,
                            poolIndex,
                          ),
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <GrantDeadlineDialog
        grant={selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
