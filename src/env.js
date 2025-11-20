import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // specify server-side environment variables schema here so you can ensure the app isn't built with invalid env vars
  server: {
    DATABASE_URL: z.url(),
    // used for local migrations or direct connections (optional)
    DIRECT_URL: z.url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  // specify client-side environment variables schema here so you can ensure the app isn't built with invalid env vars
  // to expose them to the client prefix them with `NEXT_PUBLIC_`
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string(),
  },

  // you can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g. middlewares) or client-side so we need to destruct manually
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },

  // run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  // makes it so that empty strings are treated as undefined `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error
  emptyStringAsUndefined: true,
});
