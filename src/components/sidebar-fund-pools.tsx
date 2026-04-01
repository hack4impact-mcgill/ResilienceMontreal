"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Settings } from "lucide-react";
import { FundPoolsModal } from "./fund-pools-modal";

export function SidebarFundPools() {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: fundPools = [] } = api.fundPool.getAll.useQuery();
  const { data: uncategorized } = api.fundPool.getUncategorized.useQuery();
  const { data: totalFunding } = api.fundPool.getTotalFunding.useQuery();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <SidebarGroup>
        <div className="flex items-center justify-between">
          <SidebarGroupLabel>Funding Pools</SidebarGroupLabel>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <SidebarGroupContent>
          {totalFunding && (
            <div className="px-2 py-1 text-sm font-medium text-gray-900 border-b border-gray-200 mb-2">
              Total: {formatCurrency(totalFunding.total)}
            </div>
          )}

          <SidebarMenu>
            {fundPools.map((pool) => (
              <SidebarMenuItem key={pool.id}>
                <SidebarMenuButton asChild>
                  <div className="flex justify-between items-center w-full">
                    <span>{pool.category}</span>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(pool.calculatedAmount)}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {uncategorized && uncategorized.count > 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-gray-500 italic">Uncategorized</span>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(uncategorized.totalAmount)}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <FundPoolsModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
