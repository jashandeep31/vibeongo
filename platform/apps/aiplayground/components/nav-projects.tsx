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
import {
  ChevronRight,
  Folder,
  MessageCircle,
  Plus,
  SquareTerminal,
} from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  url: string;
  defaultOpen?: boolean;
  chats: {
    id: string;
    name: string;
    url: string;
    isRunning?: boolean;
    defaultOpen?: boolean;
    canCreateSession?: boolean;
    sessions: {
      id: string;
      name: string;
      url: string;
      directory: string;
    }[];
  }[];
};

export function NavProjects({ projects }: { projects: Project[] }) {
  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupLabel className="text-sidebar-foreground px-3 text-sm font-semibold">
        Projects
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {projects.map((project) => (
            <Collapsible
              key={project.id}
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
                      <Collapsible
                        key={chat.id}
                        asChild
                        defaultOpen={chat.defaultOpen}
                        className="group/chat"
                      >
                        <SidebarMenuSubItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuSubButton asChild>
                              <button type="button">
                                <MessageCircle />
                                <span className="min-w-0 flex-1 truncate">
                                  {chat.name}
                                </span>
                                {chat.isRunning ? (
                                  <span
                                    className="ml-auto size-2 shrink-0 rounded-full bg-emerald-500"
                                    title="Running"
                                  >
                                    <span className="sr-only">Running</span>
                                  </span>
                                ) : null}
                                <ChevronRight
                                  className={`${chat.isRunning ? "ml-1" : "ml-auto"} transition-transform group-data-[state=open]/chat:rotate-90`}
                                />
                              </button>
                            </SidebarMenuSubButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub className="mr-0 ml-4">
                              {chat.sessions.map((session) => (
                                <SidebarMenuSubItem key={session.id}>
                                  <SidebarMenuSubButton asChild size="sm">
                                    <Link href={session.url}>
                                      <SquareTerminal />
                                      <span
                                        className="min-w-0 flex-1 truncate"
                                        title={session.name}
                                      >
                                        {session.name}
                                      </span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                              {chat.canCreateSession ? (
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild size="sm">
                                    <Link
                                      href={{
                                        pathname: chat.url,
                                        query: chat.sessions[0]?.directory
                                          ? {
                                              directory:
                                                chat.sessions[0].directory,
                                            }
                                          : undefined,
                                      }}
                                    >
                                      <Plus />
                                      <span>New chat</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ) : null}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuSubItem>
                      </Collapsible>
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
