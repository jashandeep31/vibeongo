"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
import { useGetProjects } from "@/hooks/use-project";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@repo/ui/components/sidebar-v2";
import { CreditCard, Gauge, Settings, Sparkles, SquarePen } from "lucide-react";
import Link from "next/link";

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
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function PlaygroundSidebar() {
  const { data: projectData } = useGetProjects();
  const { data: sessionData } = useGetProjectSessions({ limit: 100 });
  const projects = (projectData ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    url: `/projects/${project.id}`,
    sessions: (sessionData?.data ?? [])
      .filter((session) => session.project_id === project.id)
      .map((session) => ({
        id: session.id,
        name: session.name,
        projectId: project.id,
      })),
  }));

  return (
    <Sidebar className="bg-background">
      <SidebarHeader className="h-12 justify-center px-3 py-2">
        <Link
          href="/"
          aria-label="AI Playground"
          className="flex size-8 items-center justify-center rounded-lg"
        >
          <Sparkles className="size-5" />
        </Link>
      </SidebarHeader>
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
