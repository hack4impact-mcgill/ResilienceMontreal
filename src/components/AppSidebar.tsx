"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

import { api } from "@/trpc/react";
import Image from "next/image";

const items = [
  { title: "Dashboard", url: "/" },
  { title: "Grants", url: "#" },
  { title: "Expenses", url: "#" },
  { title: "Clients", url: "clients" },
];

const fundingPools = [
  { name: "Housing", amount: 3000 },
  { name: "Furniture", amount: 2000 },
  { name: "Clothing", amount: 1000 },
];

export function AppSidebar() {
  const router = useRouter();

  const signOutMutation = api.auth.signOut.useMutation({
    onSuccess: async () => {
      router.push("/login");
      router.refresh();
    },
    onError: (err) => {
      console.error("Sign out failed:", err);
    },
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>

          {/* USER PROFILE + DROPDOWN */}
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

            {/* DROPDOWN */}
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
              <DropdownMenuItem className="flex items-center gap-2 px-3 py-1">
                <UserRound size={16} />
                <span>People &amp; Permissions</span>
              </DropdownMenuItem>

              <div className="h-px bg-border mx-3 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2 px-3 py-1"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                <UserRound size={16} />
                <span>
                  {signOutMutation.isPending ? "Logging out…" : "Logout"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PUSH NAV DOWN */}
          <div className="mt-10" />

          {/* NAVIGATION */}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* FUNDING POOL */}
        <div className="mt-10 px-4 text-xs">
          <div className="flex items-center justify-between mb-2 font-medium text-muted-foreground">
            <span className="-ml-2">FUNDING POOLS</span>
            <span className="tabular-nums px-2">$7,500</span>
          </div>

          <div className="space-y-2">
            {fundingPools.map((pool) => (
              <div
                key={pool.name}
                className="flex items-center justify-between w-full px-2"
              >
                <span>{pool.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  ${pool.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

      </SidebarContent>

      {/* FOOTER */}
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
    </Sidebar>
  );
}