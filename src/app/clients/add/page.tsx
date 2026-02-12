import { AddClientForm } from "@/components/add-client-form";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { prisma } from "@/lib/prisma";

export default async function AddClientPage() {
  // Check user authentication and role
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || (user.role !== "InterventionTeam" && user.role !== "Admin")) {
    redirect("/unauthorized");
  }
  return (
    <div className="p-8">
      <h1 className="text-4xl mb-8">Add Client</h1>
      <AddClientForm />
    </div>
  );
}
