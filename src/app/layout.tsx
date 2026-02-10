import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { getServerAuthSession } from "~/server/auth";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "sonner";

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
            {isLoggedIn ? <AppSidebar /> : null}
            {/* {<AppSidebar />} */}
            <main className="w-full">
              {isLoggedIn ? <SidebarTrigger /> : null}
              {/* {<SidebarTrigger />} */}
              {children}
            </main>
          </SidebarProvider>
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                marginTop: '20px',
              },
              classNames: {
                error: 'bg-red-50 text-red-900 border-red-200',
                success: 'bg-green-50 text-green-900 border-green-200',
              },
            }}
          />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
