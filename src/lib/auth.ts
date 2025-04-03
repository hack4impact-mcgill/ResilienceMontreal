import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from "jsonwebtoken";

/**
 * server-side function to check for a valid jwt in the cookies, and if so, redirect to the dashboard
 */
export const redirectIfLoggedIn = async () => {

  // redirect to dashboard if the user is logged in
  const cookieStore = await cookies();
  const token = JSON.parse(cookieStore.get('token')?.value ?? "{}")?.accessToken ?? "";

  // check the validity of the token
  jwt.verify(token, process.env.JWT_SECRET as string, (err: unknown) => {
    if (!err) {
      redirect("/dashboard");
    }
  });

}

/**
* server-side function to check for a valid jwt in the cookies, and if not found, redirect to login
*/
export const redirectIfNotLoggedIn = async () => {

 // redirect to dashboard if the user is logged in
 const cookieStore = await cookies();
 const token = JSON.parse(cookieStore.get('token')?.value ?? "{}")?.accessToken ?? "";

 // check the validity of the token
 jwt.verify(token, process.env.JWT_SECRET as string, (err: unknown) => {
   if (err) {
     redirect("/");
   }
 });

}