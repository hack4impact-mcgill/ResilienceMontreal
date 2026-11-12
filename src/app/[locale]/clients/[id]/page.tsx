import { notFound, redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { prisma } from "@/lib/prisma";
import { ClientDetail } from "../_components/client-detail";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  return <ClientDetail id={numericId} />;
}
