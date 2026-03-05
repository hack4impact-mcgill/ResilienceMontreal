import { ClientsTable } from "./_components/data-table";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { api } from "~/trpc/react";
import { getServerAuthSession } from "~/server/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
  // Check user authentication and role
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== "InterventionTeam" && user.role !== "Admin")) {
    redirect("/unauthorized");
  }
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list.usePrefetchQuery(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="p-8">
        <h1 className="text-4xl mb-4">Clients</h1>
        <ClientsTable />
      </div>
    </HydrationBoundary>
  );
}
