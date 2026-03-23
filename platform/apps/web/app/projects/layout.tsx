import { ProjectsSidebar } from "@/components/projects-sidebar";
import { SidebarProvider } from "@repo/ui/components/sidebar";
import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProjectsSidebar />
      <main className="grid w-full">{children}</main>
    </SidebarProvider>
  );
}
