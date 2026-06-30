"use client";

import { usePathname } from "@/i18n/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

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
    return (
      <main className="w-full">
        <div className="flex justify-end border-b border-border px-4 py-2">
          <LocaleSwitcher />
        </div>
        {children}
      </main>
    );
  }

  return (
    <>
      <AppSidebar />
      <main className="w-full">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <SidebarTrigger />
          <LocaleSwitcher />
        </div>
        {children}
      </main>
    </>
  );
}
