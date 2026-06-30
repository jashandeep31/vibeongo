import DashboardNavbar from "@/components/dashboard-navbar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { VibeSocketProvider } from "@/hooks/use-vibe-socket";
import { isAuthenticated } from "@/lib/get-session";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import { redirect } from "next/navigation";
import React from "react";

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }
  return (
    <div>
      <VibeSocketProvider>
        <SidebarProvider>
          <DashboardNavbar />
          <DashboardSidebar />
          <div className="mt-12 grid w-full">{children}</div>
        </SidebarProvider>
      </VibeSocketProvider>
    </div>
  );
}
