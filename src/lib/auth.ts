import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

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

export interface User {
  email: string;
  name: string;
  role: string;
}

/**
 * get info about the current user
 */
export const getCurrentUser = async () => {

  // get and read the token
  const cookieStore = await cookies();
  const token = JSON.parse(cookieStore.get('token')?.value ?? "{}")?.accessToken ?? "";
  const decodedToken: JwtPayload = jwt.verify(token, process.env.JWT_SECRET as string);

  // find the user in the database
  const user = await prisma.user.findUnique({ where: { id: decodedToken.userId } });
  
  // return the data we want the frontend to have
  return {
    email: user?.email,
    name: user?.name,
    role: user?.role
  } as User;

}