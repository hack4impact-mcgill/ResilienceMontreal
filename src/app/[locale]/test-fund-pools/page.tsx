"use client";

import { useState } from "react";
import { FundPoolModal } from "@/components/fund-pool-modal";
import { Button } from "@/components/ui/button";

export default function TestFundPoolsPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Fund Pools CRUD Test</h1>
      <p className="mb-4">
        This page is for testing the fund pools CRUD functionality.
      </p>

      <Button onClick={() => setModalOpen(true)}>Open Fund Pools Modal</Button>

      <FundPoolModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
