import { ClientsTable } from "./_components/data-table";
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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="p-8">
        <h1 className="text-4xl mb-4">Clients</h1>
        <ClientsTable />
      </div>
    </HydrationBoundary>
  );3
}
