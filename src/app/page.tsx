import HomePage from "@/components/HomePage";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from "jsonwebtoken";

export default async function Home() {

  // redirect to dashboard if the user is logged in
  const cookieStore = await cookies();
  const token = JSON.parse(cookieStore.get('token')?.value ?? "{}")?.accessToken ?? "";

  // check the validity of the token
  jwt.verify(token, process.env.JWT_SECRET as string, (err, _decoded) => {
    if (!err) {
      redirect("/dashboard");
    }
  });

  return (
    <div>
      <HomePage />
    </div>
  );
}
