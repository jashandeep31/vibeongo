"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@repo/ui/components/sidebar-v2";
import { ChevronRight, Folder, MessageCircle } from "lucide-react";
import Link from "next/link";

type Project = {
  name: string;
  url: string;
  defaultOpen?: boolean;
  chats: {
    name: string;
    url: string;
    isRunning?: boolean;
  }[];
};

export function NavProjects({ projects }: { projects: Project[] }) {
  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupLabel className="px-3 text-sm font-semibold text-sidebar-foreground">
        Projects
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {projects.map((project) => (
            <Collapsible
              key={project.name}
              defaultOpen={project.defaultOpen}
              className="group/project"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="h-9 rounded-xl px-3 font-normal">
                    <Folder />
                    <span>{project.name}</span>
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/project:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {project.chats.map((chat) => (
                      <SidebarMenuSubItem key={chat.name}>
                        <SidebarMenuSubButton asChild>
                          <Link href={chat.url}>
                            <MessageCircle />
                            <span>{chat.name}</span>
                            {chat.isRunning ? (
                              <span
                                className="ml-auto size-2 shrink-0 rounded-full bg-emerald-500"
                                title="Running"
                              >
                                <span className="sr-only">Running</span>
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
