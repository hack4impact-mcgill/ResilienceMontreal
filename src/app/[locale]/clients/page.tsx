import { ClientsTable } from "./_components/data-table";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "~/trpc/server";
import { getServerAuthSession } from "~/server/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientsPage() {
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

  void api.clients.getClients.prefetch({
    page: 1,
    limit: 30,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  void api.users.list.prefetch();

  return (
    <HydrateClient>
      <div className="p-8">
        <h1 className="text-4xl mb-4">Clients</h1>
        <ClientsTable />
      </div>
    </HydrateClient>
  );
}
