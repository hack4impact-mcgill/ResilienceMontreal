# Development

## Server-side vs. Client-side Components in Next.js

Next.js supports both server-side and client-side components:

- **Server-side components** (marked with `export async function` or no `"use client"` directive) are rendered on the server. They can fetch data directly, perform SSR, and send HTML to the client.
- **Client-side components** (marked with `"use client"` at the top) are rendered in the browser. They can use React hooks, manage local state, and interact with the user after the page loads.

### Interaction with React Query

Hydration is the process where the client-side JavaScript takes over a server-rendered HTML page and makes it interactive. When a page is rendered on the server, it sends static HTML to the browser. Hydration attaches React event listeners and state to this HTML, enabling dynamic features like clicks, form handling, and live updates.

React Query can be used in both server and client components, but its behavior differs:

- In **server components**, you typically fetch data and pre-populate the React Query cache using `prefetchQuery` and `dehydrate`. This cache is then sent to the client for hydration.
- In **client components**, you use hooks like `useQuery` and `useMutation` to fetch, update, and manage data interactively. After hydration, React Query continues to manage the cache and refetch data as needed.

**Example:**

```tsx
// Server-side component
export default async function Page() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientsTable /> {/* Client-side component */}
    </HydrationBoundary>
  );
}

// Client-side component ("use client" at top)
("use client");
export const ClientsTable = () => {
  const { data } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  // ...render table...
};
```

This pattern allows you to fetch data on the server for fast initial load and SEO, then continue managing and updating data on the client with React Query hooks.

## Data tables

This project uses **React Query ([docs](https://tanstack.com/query/v5/docs/framework/react/overview))**, **TanStack Table ([docs](https://tanstack.com/table/latest/docs/introduction))**, and **ShadCN ([docs](https://ui.shadcn.com/docs))** to build interactive, styled data tables. Below are specific examples and explanations:

### HydrationBoundary and Server-Side Data

To support server-side rendering (SSR) and hydration, the `ClientsPage` component uses React Query's `dehydrate` and `HydrationBoundary`:

**Hydration** is the process of making server-rendered data available to the client after the initial page load, so the client can continue using the data without refetching it. **Dehydration** refers to serializing the server-fetched data so it can be sent to the client and then "rehydrated" into React Query's cache.

This approach is important because:

- It avoids unnecessary network requests on the client, improving performance and user experience.
- It ensures that the UI is immediately populated with data, reducing loading states and flicker.
- It keeps the client and server in sync, so React Query can continue managing the data seamlessly after hydration.

In practice, when the server renders the page, it fetches the required data and stores it in React Query's cache. The cache is then dehydrated (serialized) and sent to the client. On the client, `HydrationBoundary` rehydrates the cache, making the data instantly available for React Query hooks like `useQuery`.

```tsx
import { ClientsTable } from "./data-table";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { fetchClients } from "@/lib/api";

export default async function ClientsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });
  return (
    <HydrationBoundary state={dehydrate(new QueryClient())}>
      <ClientsTable />
    </HydrationBoundary>
  );
}
```

This ensures that data fetched on the server is available to the client without refetching, improving performance and user experience.

### React Query: Fetching Data

The `ClientsTable` component uses React Query's `useQuery` to fetch and manage client data:

```tsx
const {
  data: clients,
  isLoading,
  isError,
} = useQuery({
  queryKey: ["clients"],
  queryFn: fetchClients,
});
```

### TanStack Table: Table State and Columns

TanStack Table is used to manage table state (sorting, filtering, pagination) and render columns:

```tsx
const table = useReactTable<Client>({
  data: clients ?? [],
  columns,
  onSortingChange: setSorting,
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onColumnVisibilityChange: setColumnVisibility,
  onRowSelectionChange: setRowSelection,
  state: {
    sorting,
    columnFilters,
    columnVisibility,
    rowSelection,
  },
});
```

Columns are defined in `columns.tsx`:

```tsx
export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rentStartDate: Date;
  rentEndDate: Date;
};

export const columns: ColumnDef<Client>[] = [
  {
    accessorKey: "firstName",
    header: "First Name",
    cell: (info) => info.getValue(),
  },
  // ...other columns...
];
```

### ShadCN: Styled Components

UI elements such as `Button`, `Input`, and `DropdownMenu` are imported from shadcn/ui and used throughout the table for consistent styling and interaction:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// ...
<Button onClick={onAddClient}>Add Client</Button>;
```

Here's an example of how to download a specific component:

```bash
npx shadcn@latest add table
```

## Styling

Styling is managed globally using Tailwind CSS, with custom variables and layers defined in `globals.css`. For example:
