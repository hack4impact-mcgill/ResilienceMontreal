import type { Metadata } from "next";
import "./globals.css";
import { TRPCReactProvider } from "~/trpc/react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export const metadata: Metadata = {
  title: "Resilience Montreal",
  description: "TBA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full">
              <SidebarTrigger />
              {children}
            </main>
          </SidebarProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
