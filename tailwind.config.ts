import type { Config } from "tailwindcss";
import sharedTheme from "./sharedTheme";

export default {
  important: true,
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: sharedTheme.light.colors.primary,
        secondary: sharedTheme.light.colors.secondary,
        background: sharedTheme.light.colors.background,
        foreground: sharedTheme.light.colors.foreground,
        dark: {
          primary: sharedTheme.dark.colors.primary,
          secondary: sharedTheme.dark.colors.secondary,
          background: sharedTheme.dark.colors.background,
          foreground: sharedTheme.dark.colors.foreground,
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
