import { redirect } from "next/navigation";
import { api } from "~/trpc/react";


export default async function PrivatePage() {
  const session = api.auth.getSession.useQuery().data;

  if (!session) {
    redirect("/login");
  }

  return <p>Hello {session.user?.email}</p>;
}
