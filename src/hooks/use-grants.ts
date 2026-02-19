import { api } from "@/trpc/react";
import type { RouterInputs } from "@/trpc/react";

export type GrantQueryParams = RouterInputs["grant"]["getGrants"];

export function useGrants(params?: GrantQueryParams) {
  const query = api.grant.getGrants.useQuery(params);

  return {
    grants: query.data?.grants ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
