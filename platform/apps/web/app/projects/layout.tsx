import { ProjectsSidebar } from "@/components/projects-sidebar";
import { getSession } from "@/lib/getSession";
import { SidebarProvider } from "@repo/ui/components/sidebar";
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
      <ProjectsSidebar />
      <main className="grid w-full">{children}</main>
    </SidebarProvider>
  );
}
