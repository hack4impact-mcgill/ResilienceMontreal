"use client";

import * as React from "react";

interface Options<TSortBy extends string> {
  defaultSortBy: TSortBy;
  defaultSortOrder?: "asc" | "desc";
  defaultLimit?: 30 | 50 | 100;
}

export function useServerTableState<TSortBy extends string>({
  defaultSortBy,
  defaultSortOrder = "desc",
  defaultLimit = 30,
}: Options<TSortBy>) {
  const [page, setPageRaw] = React.useState(1);
  const [limit, setLimitRaw] = React.useState<30 | 50 | 100>(defaultLimit);
  const [sortBy, setSortByRaw] = React.useState<TSortBy>(defaultSortBy);
  const [sortOrder, setSortOrderRaw] = React.useState<"asc" | "desc">(
    defaultSortOrder,
  );
  const [draftSearch, setDraftSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState<string | undefined>(
    undefined,
  );

  const setPage = (p: number) => setPageRaw(p);

  const setLimit = (l: 30 | 50 | 100) => {
    setLimitRaw(l);
    setPageRaw(1);
  };

  const setSortBy = (s: TSortBy) => {
    setSortByRaw(s);
    setPageRaw(1);
  };

  const setSortOrder = (o: "asc" | "desc") => {
    setSortOrderRaw(o);
    setPageRaw(1);
  };

  const commitSearch = () => {
    setAppliedSearch(draftSearch.trim() || undefined);
    setPageRaw(1);
  };

  const clearSearch = () => {
    setDraftSearch("");
    setAppliedSearch(undefined);
    setPageRaw(1);
  };

  // Reset to page 1 when applied search changes (handles external resets)
  const prevApplied = React.useRef(appliedSearch);
  React.useEffect(() => {
    if (prevApplied.current !== appliedSearch) {
      prevApplied.current = appliedSearch;
    }
  }, [appliedSearch]);

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    draftSearch,
    setDraftSearch,
    appliedSearch,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    commitSearch,
    clearSearch,
  };
}
