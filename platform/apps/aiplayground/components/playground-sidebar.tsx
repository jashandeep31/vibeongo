"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
import { useGetVibeongoChats } from "@/hooks/use-chats";
import type { Chat } from "@/services/chat-services";
import { useProjectsStore, useSessionsStore } from "@/store/playground-store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import {
  BotMessageSquare,
  Gauge,
  House,
  Loader2,
  Settings,
  SquarePen,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  {
    title: "Home",
    url: "/",
    icon: House,
  },
  {
    title: "New Chat",
    url: "/",
    icon: SquarePen,
    isActive: false,
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

type SidebarView = "chats" | "projects";

function NavChats({
  chats,
  isPending,
  isError,
}: {
  chats: Chat[];
  isPending: boolean;
  isError: boolean;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupContent>
        {isPending ? (
          <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading chats…
          </div>
        ) : isError ? (
          <p className="text-muted-foreground px-3 py-4 text-sm">
            Could not load chats.
          </p>
        ) : chats.length === 0 ? (
          <p className="text-muted-foreground px-3 py-4 text-sm">
            No chats yet.
          </p>
        ) : (
          <SidebarMenu className="gap-1">
            {chats.map((chat) => {
              const url = `/chat/${chat.id}`;

              return (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === url}
                    className="h-9 rounded-xl px-3 text-sm font-normal"
                  >
                    <Link href={url} onClick={closeMobileSidebar}>
                      <BotMessageSquare />
                      <span className="truncate" title={chat.name}>
                        {chat.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function PlaygroundSidebar() {
  const pathname = usePathname();
  const projectData = useProjectsStore((store) => store.projects);
  const sessionData = useSessionsStore((store) => store.sessions);
  const {
    data: chats = [],
    isPending: areChatsPending,
    isError: areChatsError,
  } = useGetVibeongoChats(20);
  const routeView: SidebarView = pathname.startsWith("/chat/")
    ? "chats"
    : "projects";
  const [activeView, setActiveView] = useState<SidebarView>(routeView);

  useEffect(() => {
    setActiveView(routeView);
  }, [pathname, routeView]);

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
        <SidebarGroup className="px-2 pt-4 pb-1">
          <SidebarGroupContent>
            <NavMain items={navigation} />
          </SidebarGroupContent>
        </SidebarGroup>
        <div
          className="bg-muted/60 mx-4 mt-3 inline-flex self-start rounded-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5"
          aria-label="Sidebar view"
          role="group"
        >
          <button
            type="button"
            aria-pressed={activeView === "chats"}
            onClick={() => setActiveView("chats")}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center rounded-full px-4 text-sm transition-colors aria-pressed:shadow-sm"
          >
            Chats
          </button>
          <button
            type="button"
            aria-pressed={activeView === "projects"}
            onClick={() => setActiveView("projects")}
            className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-7 items-center justify-center rounded-full px-4 text-sm transition-colors aria-pressed:shadow-sm"
          >
            Projects
          </button>
        </div>
        {activeView === "chats" ? (
          <NavChats
            chats={chats}
            isPending={areChatsPending}
            isError={areChatsError}
          />
        ) : (
          <NavProjects projects={projects} />
        )}
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t p-2">
        <PlaygroundUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
