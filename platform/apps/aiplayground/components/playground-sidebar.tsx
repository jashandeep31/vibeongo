"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
import { useProjectsStore, useSessionsStore } from "@/store/playground-store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
} from "@repo/ui/components/sidebar-v2";
import { Gauge, Settings, SquarePen, WalletCards } from "lucide-react";

const navigation = [
  {
    title: "New Project",
    url: "/",
    icon: SquarePen,
  },
  {
    title: "Limits",
    url: "/limits",
    icon: Gauge,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: WalletCards,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function PlaygroundSidebar() {
  const projectData = useProjectsStore((store) => store.projects);
  const sessionData = useSessionsStore((store) => store.sessions);

  const projects = projectData.map((project) => ({
    id: project.id,
    name: project.name,
    url: `/projects/${project.id}`,
    sessions: sessionData
      .filter(({ session }) => session.project_id === project.id)
      .map(({ session }) => ({
        id: session.id,
        name: session.name,
        projectId: project.id,
      })),
  }));

  return (
    <Sidebar className="bg-background">
      <SidebarContent className="bg-background">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupContent>
            <NavMain items={navigation} />
          </SidebarGroupContent>
        </SidebarGroup>
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-2">
        <PlaygroundUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
