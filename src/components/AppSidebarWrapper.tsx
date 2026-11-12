"use client";

import { usePathname } from "@/i18n/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppSidebarWrapper({
  isLoggedIn,
  children,
}: {
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname?.includes("/update-password") ?? false;

  if (!isLoggedIn || hideSidebar) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </>
  );
}
