import ProjectsNavbar from "@/components/projects-navbar";
import { ProjectsSidebar } from "@/components/projects-sidebar";
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
  if (!authenticated) redirect("/login");

  return (
    <SidebarProvider>
      <ProjectsNavbar />
      <ProjectsSidebar />
      <main className="grid w-full min-w-0 overflow-x-hidden pt-16 md:pt-8">
        {children}
      </main>
    </SidebarProvider>
  );
}
