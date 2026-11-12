import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // French was removed (#179); send old /fr links to the English page
  async redirects() {
    return [
      { source: "/fr", destination: "/en", permanent: true },
      { source: "/fr/:path*", destination: "/en/:path*", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
