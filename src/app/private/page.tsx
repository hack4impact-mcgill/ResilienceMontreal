import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";

export default async function PrivatePage() {
  const session = await getServerAuthSession();
  if (!session.user) {
    redirect("/login");
  }

  return <p>Hello {session.user?.email}</p>;
}
