"use client";
import { useGetProjects } from "@/hooks/use-project";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { ArrowLeft, Server } from "lucide-react";
import Link from "next/link";

// Mock data representing connected servers (projects)

export function ProjectsSidebar() {
  const { data: projects } = useGetProjects();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                >
                  <Link href="/dashboard" onClick={closeMobileSidebar}>
                    <ArrowLeft className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Connected Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((server) => (
                <SidebarMenuItem key={server.id}>
                  <SidebarMenuButton
                    asChild
                    className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                  >
                    <Link
                      href={`/projects/${server.id}`}
                      onClick={closeMobileSidebar}
                    >
                      <Server className="h-4 w-4" />
                      <span>{server.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
