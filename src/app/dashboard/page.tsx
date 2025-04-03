import Dashboard from "./Dashboard";
import { redirectIfNotLoggedIn } from "@/lib/auth";

export default async function Home() {

  await redirectIfNotLoggedIn();

  return (
    <div>
      <Dashboard />
    </div>
  );
}
