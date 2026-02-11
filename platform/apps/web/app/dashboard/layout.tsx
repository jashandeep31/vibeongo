import DashboardNavbar from "@/components/dashboard-navbar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DashboardNavbar />
      {children}
    </div>
  );
}
