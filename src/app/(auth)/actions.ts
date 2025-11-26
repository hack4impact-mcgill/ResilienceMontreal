"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // console.log(data);
  const { error } = await supabase.auth.signInWithPassword(data);

  const defaultRoleName = "Unassigned";
  const defaultRole = await prisma.role.findUnique({ where: { name: defaultRoleName } });

  if (error) {
    console.log(error);
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

  const defaultRoleName = "Unassigned";
  const defaultRole = await prisma.role.findUnique({ where: { name: defaultRoleName } });

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
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
        supabaseId: supabaseUser?.id ?? undefined,
        isConfirmed: (supabaseUser as any)?.email_confirmed ?? false,
        roleId: defaultRole?.id ?? undefined,
      },
      create: {
        email,
        name,
        supabaseId: supabaseUser?.id ?? undefined,
        password: "",
        roleId: defaultRole?.id ?? undefined,
        isConfirmed: (supabaseUser as any)?.email_confirmed ?? false,
      },
    });

    console.log(`Created Prisma user for ${email} with Unassigned role`);
  } catch (dbError) {
    console.error("Failed to create Prisma user:", dbError);
    // Note: Supabase user already created - might want to handle this edge case
  }

  revalidatePath("/", "layout");
  redirect("/");
}
