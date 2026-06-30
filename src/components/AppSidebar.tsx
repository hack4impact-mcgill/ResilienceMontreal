"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "~/trpc/react";
import { createClient } from "@/utils/supabase/client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { UserRound } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import Image from "next/image";

const navItems: {
  titleKey: "dashboard" | "grants" | "expenses" | "clients";
  url: string;
}[] = [
  { titleKey: "dashboard", url: "/" },
  { titleKey: "grants", url: "/grants" },
  { titleKey: "expenses", url: "/expenses" },
  { titleKey: "clients", url: "/clients" },
];

export function AppSidebar() {
  const t = useTranslations("navigation");
  const router = useRouter();
  const [showUnauthorized, setShowUnauthorized] = React.useState(false);

  const supabase = createClient();

  const { data: currentUser } = api.users.me.useQuery();

  const canViewFundPools =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Bookkeeper" ||
    currentUser?.role === "InterventionTeam";

  const canEdit =
    currentUser?.role === "Admin" || currentUser?.role === "Bookkeeper";

  const { data: fundPools } = api.fundPool.getAll.useQuery(undefined, {
    enabled: canViewFundPools,
  });

  const totalRemaining = fundPools?.reduce(
    (sum, pool) => sum + Number(pool.calculatedAmount),
    0,
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="
                  w-full
                  flex
                  items-start
                  gap-2
                  px-3
                  py-2
                  mt-2
                  rounded-md
                  text-left
                  hover:bg-muted
                  transition-colors
                "
              >
                <UserRound size={26} />
                <div className="text-xs leading-tight">
                  <div>Firstname Familyname</div>
                  <div className="opacity-70">Admin</div>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={2}
              className="
                w-[120%]
                -ml-[1%]
                rounded-none
                bg-sidebar
                shadow-none
                border
                border-border
                px-0
                py-0
              "
            >
              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-1"
              >
                <Link href="/admin/users">
                  <UserRound size={16} />
                  <span>People &amp; Permissions</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-1"
              >
                <Link href="/update-password">
                  <UserRound size={16} />
                  <span>Change password</span>
                </Link>
              </DropdownMenuItem>

              <div className="h-px bg-border mx-3 my-1" />

              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2 px-3 py-1"
                onClick={signOut}
              >
                <UserRound size={16} />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mt-10" />

          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* FUNDING POOL */}
        {canViewFundPools && (
          <div className="mt-10 px-4 text-xs">
            <div className="flex items-center justify-between mb-2 font-medium text-muted-foreground">
              <span className="-ml-2">FUNDING POOLS</span>
              <span className="tabular-nums px-2">
                {totalRemaining !== undefined
                  ? `$${totalRemaining.toLocaleString()}`
                  : "..."}
              </span>
            </div>

            <div className="space-y-2">
              {fundPools?.map((pool) => (
                <div
                  key={pool.id}
                  className="flex items-center justify-between w-full px-2"
                >
                  <span>{pool.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    ${Number(pool.calculatedAmount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {canEdit && (
              <button
                className="mt-3 w-full rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => router.push("/fund-pools")}
              >
                Edit
              </button>
            )}
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <span className="inline-flex items-center justify-center w-full mt-4">
              <Image
                src="/resilience-banner.png"
                alt="Logo"
                width={150}
                height={150}
                className="opacity-90"
              />
            </span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* UNAUTHORIZED DIALOG */}
      <AlertDialog open={showUnauthorized} onOpenChange={setShowUnauthorized}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unauthorized</AlertDialogTitle>
            <AlertDialogDescription>
              You are not authorized to perform this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowUnauthorized(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
