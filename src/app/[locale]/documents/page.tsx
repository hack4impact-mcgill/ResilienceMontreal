import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { DocumentsBrowser } from "./_components/documents-browser";

export default async function DocumentsPage() {
  const session = await getServerAuthSession();
  if (!session.user) redirect("/login");
  return (
    <div className="p-8">
      <DocumentsBrowser />
    </div>
  );
}
