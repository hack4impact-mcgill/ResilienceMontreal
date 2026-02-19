import { useState, useEffect, useCallback } from "react";
import type { Grant, GrantsResponse, GrantQueryParams } from "@/types/grants";
import { buildGrantsQueryString } from "@/types/grants";

interface UseGrantsOptions extends GrantQueryParams {
  enabled?: boolean;
}

interface UseGrantsReturn {
  grants: Grant[];
  pagination: GrantsResponse["pagination"] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGrants(options: UseGrantsOptions = {}): UseGrantsReturn {
  const { enabled = true, ...queryParams } = options;

  const [grants, setGrants] = useState<Grant[]>([]);
  const [pagination, setPagination] = useState<
    GrantsResponse["pagination"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrants = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildGrantsQueryString(queryParams);
      const url = `/api/grants${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch grants");
      }

      const data: GrantsResponse = await response.json();
      setGrants(data.grants);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGrants([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, JSON.stringify(queryParams)]);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  return {
    grants,
    pagination,
    isLoading,
    error,
    refetch: fetchGrants,
  };
}
