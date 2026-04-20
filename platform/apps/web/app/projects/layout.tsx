import { ProjectsSidebar } from "@/components/projects-sidebar";
import { getSession } from "@/lib/getSession";
import { SidebarProvider, SidebarTrigger } from "@repo/ui/components/sidebar";
import { redirect } from "next/navigation";
import React from "react";

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <span className="Left-0 fixed top-0 z-50 block md:hidden">
        <SidebarTrigger className="mt-2 ml-2" />
      </span>
      <ProjectsSidebar />
      <main className="grid w-full">{children}</main>
    </SidebarProvider>
  );
}
