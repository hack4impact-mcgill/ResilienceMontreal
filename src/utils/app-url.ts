import { env } from "~/env";

/**
 * Public origin for auth redirect URLs (email confirmation, password reset).
 * Vercel preview deployments each get a unique URL via VERCEL_URL.
 */
export function getAppUrl(): string {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return env.NEXT_PUBLIC_APP_URL;
}
