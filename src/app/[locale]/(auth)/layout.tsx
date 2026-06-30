import { TopNavbar } from "@/components/TopNavbar";
import React from "react";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-shrink-0">
        <TopNavbar />
      </div>
      <div className="flex-1 flex items-center justify-center">{children}</div>
    </div>
  );
}
