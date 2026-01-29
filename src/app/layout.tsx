import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { getServerAuthSession } from "~/server/auth";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resilience Montreal",
  description: "TBA",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch server-side session so we can decide whether to render the sidebar
  const session = await getServerAuthSession();

  const isLoggedIn = Boolean(session?.user);
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          <SidebarProvider>
            {/* {isLoggedIn ? <AppSidebar /> : null}  */}
            {<AppSidebar />}
            <main className="w-full">
              {/* {isLoggedIn ? <SidebarTrigger /> : null} */}
              {<SidebarTrigger />}
              {children}
            </main>
          </SidebarProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
