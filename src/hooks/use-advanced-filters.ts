"use client";

import * as React from "react";

export function useAdvancedFilters<TFilters extends Record<string, unknown>>(
  empty: TFilters,
) {
  const [draft, setDraftRaw] = React.useState<TFilters>(empty);
  const [applied, setApplied] = React.useState<TFilters>(empty);

  const setDraft = (update: Partial<TFilters>) =>
    setDraftRaw((prev) => ({ ...prev, ...update }));

  const apply = () => {
    setApplied({ ...draft });
  };

  const clear = () => {
    setDraftRaw({ ...empty });
    setApplied({ ...empty });
  };

  const hasApplied = Object.values(applied).some(
    (v) => v !== "" && v !== undefined && v !== null,
  );

  const hasPending =
    JSON.stringify(draft) !== JSON.stringify(applied);

  return { draft, setDraft, applied, apply, clear, hasApplied, hasPending };
}
