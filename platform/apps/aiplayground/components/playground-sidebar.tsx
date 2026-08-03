"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
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

const demoProjects = [
  {
    name: "Website Launch",
    url: "/projects/website-launch",
    defaultOpen: true,
    chats: [
      {
        name: "Landing page copy",
        url: "/projects/website-launch/chats/landing-page-copy",
        isRunning: true,
      },
      {
        name: "Fix authentication",
        url: "/projects/website-launch/chats/fix-authentication",
      },
    ],
  },
  {
    name: "Mobile App",
    url: "/projects/mobile-app",
    defaultOpen: true,
    chats: [
      {
        name: "API integration",
        url: "/projects/mobile-app/chats/api-integration",
        isRunning: true,
      },
      {
        name: "Onboarding flow",
        url: "/projects/mobile-app/chats/onboarding-flow",
      },
    ],
  },
];

export function PlaygroundSidebar() {
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
        <NavProjects projects={demoProjects} />
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-2">
        <PlaygroundUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
