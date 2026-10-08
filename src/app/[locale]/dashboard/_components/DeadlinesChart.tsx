"use client";

import * as React from "react";

import { api } from "@/trpc/react";
import { GrantDeadlineDialog } from "./GrantDeadlineDialog";
import {
  PROGRESS_COLOR,
  barPosition,
  formatMonthYear,
  getYearDomain,
  monthTicks,
  poolColor,
  progressPct,
  sortDeadlineGrants,
  toDeadlineGrants,
} from "./deadlines-utils";

const LABEL_WIDTH_PX = 200;
const ROW_HEIGHT_PX = 36;

export function DeadlinesChart() {
  const grantsQuery = api.grant.getGrants.useQuery({
    limit: 100,
    status: "APPROVED",
  });
  const poolsQuery = api.fundPool.getAll.useQuery();
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

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

  // Fixed Jan–Dec axis (current year), per the RM-145 mockup.
  const domain = React.useMemo(
    () => getYearDomain(new Date().getFullYear()),
    [],
  );
  const ticks = React.useMemo(
    () => (domain ? monthTicks(domain) : []),
    [domain],
  );

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
    const now = Date.now();
    if (now < min || now > max) return null;
    return ((now - min) / (max - min)) * 100;
  }, [domain]);

  if (grantsQuery.isLoading || poolsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading deadlines…</p>;
  }

  if (grantsQuery.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load grant deadlines. Check your database connection
        and try again.
      </p>
    );
  }

  if (grants.length === 0) {
    return <p className="text-sm text-muted-foreground">No grants with deadlines yet.</p>;
  }

  const selected = grants.find((g) => g.id === selectedId) ?? null;
  const min = domain.min.getTime();
  const max = domain.max.getTime();

  return (
    <div className="flex flex-col gap-4">
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
        <span className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: PROGRESS_COLOR }}
          />
          Spent (% of grant)
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <div style={{ minWidth: LABEL_WIDTH_PX + 600 }}>
          <div className="flex border-b" style={{ height: ROW_HEIGHT_PX }}>
            <div
              className="shrink-0 px-3 text-xs font-medium uppercase text-muted-foreground"
              style={{ width: LABEL_WIDTH_PX, lineHeight: `${ROW_HEIGHT_PX}px` }}
            >
              Grant
            </div>
            <div className="relative flex-1">
              {ticks.map((t) => {
                const left = ((t.getTime() - min) / (max - min)) * 100;
                return (
                  <span
                    key={t.toISOString()}
                    className="absolute top-0 whitespace-nowrap border-l pl-1 text-xs text-muted-foreground"
                    style={{ left: `${left}%`, lineHeight: `${ROW_HEIGHT_PX}px` }}
                  >
                    {formatMonthYear(t)}
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
                style={{ left: `calc(${LABEL_WIDTH_PX}px + (100% - ${LABEL_WIDTH_PX}px) * ${todayPct / 100})` }}
                title="Today"
              >
                <span className="absolute -top-1 -translate-x-1/2 rounded bg-red-500 px-1 text-[10px] text-white">
                  today
                </span>
              </div>
            )}
            {grants.map((g) => {
              const { leftPct, widthPct } = barPosition(g.start, g.deadline, domain);
              const poolIndex = Math.max(0, poolOrder.indexOf(g.poolName));
              const progress = progressPct(g.spent, g.total);
              return (
                <div
                  key={g.id}
                  className="flex items-center border-b last:border-0"
                  style={{ height: ROW_HEIGHT_PX }}
                >
                  <div
                    className="shrink-0 truncate px-3 text-sm"
                    style={{ width: LABEL_WIDTH_PX }}
                    title={g.title}
                  >
                    {g.title}
                  </div>
                  <div className="relative h-full flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className="absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
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
                          backgroundColor: PROGRESS_COLOR,
                          opacity: 0.85,
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

      <GrantDeadlineDialog grant={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
