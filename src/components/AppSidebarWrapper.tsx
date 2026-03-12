"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const HIDE_SIDEBAR_PATHS = ["/update-password"];

export function AppSidebarWrapper({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = HIDE_SIDEBAR_PATHS.some((path) => pathname?.startsWith(path));

  if (!isLoggedIn || hideSidebar) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <>
      <AppSidebar />
      <main className="w-full">
        <SidebarTrigger />
        {children}
      </main>
    </>
  );
}
