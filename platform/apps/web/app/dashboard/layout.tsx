import DashboardNavbar from "@/components/dashboard-navbar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DashboardNavbar />
      <SidebarProvider>
        <DashboardSidebar />
        <div className="w-full grid mt-12">{children}</div>
      </SidebarProvider>
    </div>
  );
}
