import { ServerSidebar } from "@/components/server-sidebar";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ServerSidebar />
      <main className="w-full grid">{children}</main>
    </SidebarProvider>
  );
}
