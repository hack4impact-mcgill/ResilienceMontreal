export interface Grant {
  id: number;
  title: string;
  description: string;
  totalAmount: string;
  unassignedAmount: string;
  createdAt: string;
  updatedAt: string;
  endDate: string | null;
  status: "PENDING" | "APPROVED";
  distributions?: GrantDistribution[];
}

export interface GrantDistribution {
  id: number;
  grantId: number;
  fundPoolId: number;
  amount: string;
  createdAt: string;
  fundPool?: FundPool;
}

export interface FundPool {
  id: number;
  name: string;
  totalAmount: string;
  availableAmount: string;
}

export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  returnedCount: number;
}

export interface GrantsResponse {
  grants: Grant[];
  pagination: PaginationMetadata;
}

export interface GrantQueryParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "totalAmount" | "endDate" | "title";
  sortOrder?: "asc" | "desc";
  title?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
  status?: "PENDING" | "APPROVED";
}

// ex:
// const queryString = buildGrantsQueryString({
//   page: 1,
//   limit: 20,
//   sortBy: "totalAmount",
//   sortOrder: "desc",
//   status: "APPROVED"
// });
//
// const response = await fetch(`/api/grants?${queryString}`);
export function buildGrantsQueryString(params: GrantQueryParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}
