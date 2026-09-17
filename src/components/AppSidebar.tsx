"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signOut } from "@/app/[locale]/(auth)/actions";
import { api } from "~/trpc/react";

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

import { ChevronDown, KeyRound, LogOut, Users } from "lucide-react";

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

  const initials =
    currentUser?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

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
                  items-center
                  gap-3
                  px-3
                  py-2.5
                  mt-2
                  rounded-lg
                  text-left
                  border border-border
                  bg-muted/40
                  hover:bg-muted
                  transition-colors
                "
              >
                {/* Initials avatar */}
                <span
                  className="
                  flex-shrink-0
                  inline-flex items-center justify-center
                  w-8 h-8
                  rounded-full
                  bg-primary/10
                  text-primary
                  text-xs font-semibold
                  select-none
                "
                >
                  {initials}
                </span>

                {/* Name + role */}
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="text-sm font-medium truncate">
                    {currentUser?.name ?? "..."}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {currentUser?.role ?? "Unassigned"}
                  </div>
                </div>

                {/* Dropdown affordance */}
                <ChevronDown
                  size={14}
                  className="flex-shrink-0 text-muted-foreground"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="bottom"
              align="start"
              sideOffset={4}
              className="
                w-[var(--radix-dropdown-menu-trigger-width)]
                rounded-lg
                bg-sidebar
                shadow-md
                border border-border
                py-1
              "
            >
              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-2"
              >
                <Link href="/admin/users">
                  <Users size={15} className="text-muted-foreground" />
                  <span>People &amp; Permissions</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-2"
              >
                <Link href="/update-password">
                  <KeyRound size={15} className="text-muted-foreground" />
                  <span>Change password</span>
                </Link>
              </DropdownMenuItem>

              <div className="h-px bg-border mx-2 my-1" />

              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2 px-3 py-2 text-destructive focus:text-destructive"
                onClick={() => void signOut()}
              >
                <LogOut size={15} />
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
                style={{ height: "auto" }}
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
