"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { PlaygroundUserMenu } from "@/components/playground-user-menu";
import { useDeleteChat, useGetVibeongoChats } from "@repo/api-hooks";
import { useGithubRepos } from "@repo/api-hooks";
import { useWebSocket } from "@repo/api-hooks";
import { selectWorkspaceView } from "@/lib/workspace-view";
import type { Chat } from "@repo/api-client";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
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
  Ellipsis,
  Gauge,
  Github,
  House,
  Import,
  Loader2,
  Settings,
  SquarePen,
  Trash2,
  WalletCards,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const navigation = [
  {
    title: "Home",
    url: "/",
    icon: House,
  },
  {
    title: "Limits",
    url: "/limits",
    icon: Gauge,
  },
  {
    title: "Git Repos",
    url: "/git-repos",
    icon: Github,
  },
  {
    title: "Demo Projects",
    url: "/import-projects",
    icon: Import,
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
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const deleteChat = useDeleteChat();
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleDeleteChat = () => {
    if (!chatToDelete) return;

    const chat = chatToDelete;
    setChatToDelete(null);
    deleteChat.mutate(chat.id, {
      onSuccess: () => {
        if (pathname === `/chat/${chat.id}`) {
          router.push("/");
        }
        toast.success("Chat deleted");
      },
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Failed to delete chat",
        );
      },
    });
  };

  return (
    <>
      <SidebarGroup className="px-2 py-3">
        <SidebarGroupContent>
          <SidebarMenu className="mb-1 gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-9 rounded-xl px-3 text-sm font-normal"
              >
                <Link
                  href="/?view=chats"
                  onClick={() => {
                    selectWorkspaceView("chats");
                    closeMobileSidebar();
                  }}
                >
                  <SquarePen />
                  <span>New Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
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
                    <div className="flex items-center gap-1">
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === url}
                        className="h-9 min-w-0 flex-1 rounded-xl px-3 text-sm font-normal"
                      >
                        <Link href={url} onClick={closeMobileSidebar}>
                          <BotMessageSquare />
                          <span className="truncate" title={chat.name}>
                            {chat.name}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0"
                            aria-label={`Actions for ${chat.name}`}
                            title={`Actions for ${chat.name}`}
                            disabled={
                              deleteChat.isPending &&
                              deleteChat.variables === chat.id
                            }
                          >
                            {deleteChat.isPending &&
                            deleteChat.variables === chat.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Ellipsis />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={deleteChat.isPending}
                            onSelect={() => setChatToDelete(chat)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroupContent>
      </SidebarGroup>
      <ConfirmationDialog
        open={chatToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setChatToDelete(null);
        }}
        title="Delete chat?"
        description={
          chatToDelete
            ? `Delete "${chatToDelete.name}"? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmText="Delete chat"
        isDestructive
        onConfirm={handleDeleteChat}
      />
    </>
  );
}

export function PlaygroundSidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { subscribeJsonMessage } = useWebSocket();
  const projectData = useProjectsStore((store) => store.projects);
  const sessionData = useSessionsStore((store) => store.sessions);
  const {
    data: chats = [],
    isPending: areChatsPending,
    isError: areChatsError,
  } = useGetVibeongoChats(20);
  const { data: githubRepos = [] } = useGithubRepos();
  const unconfiguredRepoCount = githubRepos.filter(
    (repo) => !repo.default_project_id,
  ).length;
  const routeView: SidebarView = pathname.startsWith("/chat/")
    ? "chats"
    : "projects";
  const [activeView, setActiveView] = useState<SidebarView>(routeView);
  const navigationItems = navigation.map((item) => ({
    ...item,
    ...(item.url === "/git-repos"
      ? { warningCount: unconfiguredRepoCount }
      : {}),
  }));

  useEffect(() => {
    setActiveView(routeView);
  }, [pathname, routeView]);

  useEffect(
    () =>
      subscribeJsonMessage((message) => {
        if (message.type === "new-chat") {
          void queryClient.invalidateQueries({ queryKey: ["chats"] });
        }
      }),
    [queryClient, subscribeJsonMessage],
  );

  const projects = projectData.map((project) => ({
    id: project.id,
    name: project.name,
    url: `/projects/${project.id}`,
    sessions: sessionData
      .filter(({ session }) => session.project_id === project.id)
      .map(({ session }) => ({
        id: session.id,
        name: session.name,
        category: session.category,
        projectId: project.id,
      })),
  }));

  return (
    <Sidebar className="bg-background">
      <SidebarContent className="bg-background">
        <SidebarGroup className="px-2 pt-4 pb-1">
          <SidebarGroupContent>
            <NavMain items={navigationItems} />
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
