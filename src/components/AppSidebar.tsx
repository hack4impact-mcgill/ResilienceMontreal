"use client";

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
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

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
    url: "#",
  },
];

export function AppSidebar() {
  const router = useRouter();
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
                  <span>Name</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Role displays here</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    try {
                      signOut.mutate();
                    } catch (e) {
                      console.error(e);
                      router.push("/login");
                    }
                  }}
                >
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
              <Button
                className="w-full"
                onClick={() => signOutMutation.mutate()}
                disabled={signOutMutation.isPending}
              >
                {signOutMutation.isPending ? "Signing out..." : "Log Out"}
              </Button>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
