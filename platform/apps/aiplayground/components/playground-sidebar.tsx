"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
import { useOpencodeSessions } from "@/hooks/use-opencode-sessions";
import { playgroundProjects } from "@/lib/playground-projects";
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
  const { data: sessionsByChat } = useOpencodeSessions();
  const projects = playgroundProjects.map((project) => ({
    ...project,
    chats: project.chats.map((chat) => ({
      ...chat,
      defaultOpen: Boolean(chat.hasOpencodeServer),
      canCreateSession: Boolean(chat.hasOpencodeServer),
      sessions: (sessionsByChat?.[chat.id] ?? []).map((session) => ({
        id: session.id,
        name: session.title,
        url: `${chat.url}/sessions/${encodeURIComponent(session.id)}`,
        directory: session.directory,
      })),
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
