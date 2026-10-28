"use client";
import React from "react";

import { DeadlinesChart } from "./_components/DeadlinesChart";

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Grant deadlines across funding pools
          </p>
        </div>
        <DeadlinesChart />
      </div>
    </div>
  );
};

export default Dashboard;
