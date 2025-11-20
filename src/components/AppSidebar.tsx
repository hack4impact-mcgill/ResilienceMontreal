"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

  const signOutMutation = api.auth.signOut.useMutation({
    onSuccess: async () => {
      // navigate to the login page and then refresh so server components (layout) re-run
      // This forces the server-side session check to run again so the sidebar will be removed
      await router.push("/login");
      router.refresh();
    },
    onError: (err) => {
      console.error("signOut error:", err);
      alert(err?.message ?? "Sign out failed");
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
