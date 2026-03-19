"use client";

import { useRouter } from "next/navigation";
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
import { SidebarFundPools } from "./sidebar-fund-pools";

import { api } from "@/trpc/react";
import Image from "next/image";

const items = [
  { title: "Dashboard", url: "/" },
  { title: "Grants", url: "grants" },
  { title: "Expenses", url: "expenses" },
  { title: "Clients", url: "clients" },
];

// funding pools will be fetched live from the server

export function AppSidebar() {
  const router = useRouter();

  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // fetch session and fund pools to display live totals
  const { data: session } = api.auth.getSession.useQuery();
  const { data: fundPools } = api.fundPool.getFundPools.useQuery(undefined, {
    enabled: Boolean(session?.user),
  });

  const totalAvailable =
    fundPools?.reduce(
      (sum: number, p: any) => sum + (Number(p.amount ?? 0) || 0),
      0,
    ) ?? 0;

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
              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-1"
              >
                <a href="/admin/users">
                  <UserRound size={16} />
                  <span>People &amp; Permissions</span>
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem
                asChild
                className="cursor-pointer flex items-center gap-2 px-3 py-1"
              >
                <a href="/update-password">
                  <UserRound size={16} />
                  <span>Change password</span>
                </a>
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

        <SidebarFundPools />
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
