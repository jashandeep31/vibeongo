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
} from "@repo/ui/components/sidebar";
import { FolderOpen, Server } from "lucide-react";
import Link from "next/link";

// Mock data representing connected servers (projects)

export function ProjectsSidebar() {
  const { data: projects } = useGetProjects();
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
                  className="active:bg-background data-active:bg-background cursor-pointer"
                >
                  <Link href="/dashboard">
                    <FolderOpen className="h-4 w-4" />
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
                    className="active:bg-background data-active:bg-background cursor-pointer"
                  >
                    <Link href={`/projects/${server.id}`}>
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
