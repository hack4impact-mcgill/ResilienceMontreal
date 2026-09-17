"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { getAppUrl } from "@/utils/app-url";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error(error);
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string) || email.split("@")[0]; // Use email prefix if no name

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/confirm`,
    },
  });

  if (authError) {
    console.error("Supabase signup error:", authError);
    redirect("/error");
  }

  // Step 2: Create Prisma User record with default Unassigned role
  try {
    const supabaseUser = authData?.user;

    await prisma.user.upsert({
      where: { email },
      update: {
        name,
        supabaseId: supabaseUser?.id,
        isConfirmed: !!supabaseUser?.email_confirmed_at,
        role: "Unassigned", // Use enum value directly
      },
      create: {
        email,
        name,
        supabaseId: supabaseUser?.id || "",
        role: "Unassigned", // Use enum value directly
        isConfirmed: !!supabaseUser?.email_confirmed_at,
      },
    });
  } catch (dbError) {
    console.error("Failed to create Prisma user:", dbError);
    // Note: Supabase user already created - might want to handle this edge case
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
