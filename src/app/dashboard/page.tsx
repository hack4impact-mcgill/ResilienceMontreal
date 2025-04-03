import Dashboard from "./Dashboard";
import { redirectIfNotLoggedIn, getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/auth";

export default async function Home() {

  await redirectIfNotLoggedIn();
  const user: User = await getCurrentUser();

  return (
    <div>
      <Dashboard user={user} />
    </div>
  );
}
