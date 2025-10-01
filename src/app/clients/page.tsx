import { ClientsTable } from './data-table';
import { Client } from './columns';
import { 
  dehydrate, 
  HydrationBoundary, 
  QueryClient,
  useMutation
} from "@tanstack/react-query";
import { fetchClients } from '@/lib/api';

export default async function ClientsPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  return (
    <HydrationBoundary state={dehydrate(new QueryClient())}>
      <div className="p-8">
        <h1 className="text-4xl mb-8">Clients</h1>
        <ClientsTable 
        />
      </div>
    </HydrationBoundary>
  );
}
