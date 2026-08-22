import { createClient } from "~/utils/supabase/server";

/**
 * Gets the server-side authentication session.
 *
 * See: https://supabase.com/docs/reference/javascript/auth-getuser
 */
export async function getServerAuthSession() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        user: null,
      } as const;
    }

    return {
      user,
    } as const;
  } catch (err) {
    console.error("getServerAuthSession error:", err);
    return {
      user: null,
    } as const;
  }
}

export type ServerAuthSession = Awaited<
  ReturnType<typeof getServerAuthSession>
>;
