"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  {
    title: "Dashboard",
    url: "/",
  },
  {
    title: "Client data",
    url: "clients",
  },
  {
    title: "Grants",
    url: "#",
  },
  {
    title: "Expenses",
    url: "/expenses",
  },
];

export function AppSidebar() {
  const router = useRouter();
  const { data: me } = api.users.me.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const signOut = api.auth.signOut.useMutation({
    onSuccess: () => {
      // After signing out on the server, navigate to the login page
      router.push("/login");
    },
    onError: (err) => {
      console.error("Sign out failed:", err);
      // still navigate to login to clear client state
      router.push("/login");
    },
  });

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Resilience Montreal</SidebarGroupLabel>
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <span>My Account</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  <span>{me?.name ?? "Name"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>{me?.role?.name ?? "Role"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (signOut.status === "pending") return;
                    try {
                      signOut.mutate();
                    } catch (e) {
                      console.error(e);
                      router.push("/login");
                    }
                  }}
                  aria-disabled={signOut.status === "pending"}
                >
                  <span>
                    {signOut.status === "pending"
                      ? "Signing out..."
                      : "Sign out"}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
