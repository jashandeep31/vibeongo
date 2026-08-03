"use client";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
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
      </SidebarContent>
    </Sidebar>
  );
}
