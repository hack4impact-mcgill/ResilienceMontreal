import HomePage from "@/components/HomePage";
import { redirectIfLoggedIn } from "@/lib/auth";

export default async function Home() {

  await redirectIfLoggedIn();

  return (
    <div>
      <HomePage />
    </div>
  );
}
