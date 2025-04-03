import { NextResponse } from "next/server";
import { cookies } from 'next/headers'

export async function POST() {
  
  // remove the cookie from the browser
  const cookieStore = await cookies();
  cookieStore.delete('token');
  
  return NextResponse.json({ status: "success" });

}
