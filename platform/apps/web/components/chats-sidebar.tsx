"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { RenameChatDialog } from "@/components/dialogs/rename-chat-dialog";
import { useDeleteChat, useGetChats } from "@/hooks/use-chats";
import type { Chat } from "@/services/chat-services";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  GitFork,
  LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  PlusCircle,
  Settings,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { toast } from "sonner";

const sidebarLinks: {
  title: string;
  icon: LucideIcon;
  url: string;
}[] = [
  {
    title: "New Chat",
    url: "/chats",
    icon: PlusCircle,
  },
  {
    title: "Repos",
    url: "/dashboard/repos",
    icon: GitFork,
  },
  {
    title: "Sessions",
    url: "/dashboard/sessions",
    icon: Clock3,
  },
  {
    title: "Wallet",
    url: "/dashboard/wallet",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
] as const;

function ChatItem({ chat }: { chat: Chat }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { mutateAsync: deleteChat, isPending: isDeleting } = useDeleteChat();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleDelete = async () => {
    const toastId = toast.loading("Deleting chat");

    try {
      await deleteChat(chat.id);
      toast.success("Chat deleted", { id: toastId });

      if (pathname === `/chats/${chat.id}`) {
        router.push("/chats");
      }

      closeMobileSidebar();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete chat", { id: toastId });
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
      >
        <Link href={`/chats/${chat.id}`} onClick={closeMobileSidebar}>
          <MessageSquare />
          <span>{chat.name}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 rounded-lg" align="end">
          <RenameChatDialog chatId={chat.id} currentName={chat.name}>
            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
              <Pencil className="text-muted-foreground mr-2 h-4 w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
          </RenameChatDialog>

          <DropdownMenuSeparator />

          <ConfirmationDialog
            title="Delete Chat"
            description="Are you sure you want to delete this chat? This action cannot be undone."
            confirmText={isDeleting ? "Deleting..." : "Delete"}
            isDestructive
            onConfirm={() => {
              void handleDelete();
            }}
          >
            <DropdownMenuItem
              disabled={isDeleting}
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </ConfirmationDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function ChatsSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { data, isError, isLoading } = useGetChats();
  const chats = data?.data.chats ?? [];

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="bg-background">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                >
                  <Link href="/dashboard" onClick={closeMobileSidebar}>
                    <ArrowLeft className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible
                asChild
                defaultOpen={false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="bg-background text-foreground hover:bg-background hover:text-foreground active:bg-background active:text-foreground data-active:bg-background data-active:text-foreground cursor-pointer">
                      <span>Quick Links</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {sidebarLinks.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            className="bg-background text-foreground hover:bg-background hover:text-foreground active:bg-background active:text-foreground data-active:bg-background data-active:text-foreground cursor-pointer"
                          >
                            <Link
                              href={item.url}
                              onClick={closeMobileSidebar}
                            >
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                >
                  <Link href="/chats" onClick={closeMobileSidebar}>
                    <PlusCircle className="h-4 w-4" />
                    <span>New Chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isLoading ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    Loading chats...
                  </div>
                </SidebarMenuItem>
              ) : null}

              {isError ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    Failed to load chats.
                  </div>
                </SidebarMenuItem>
              ) : null}

              {!isLoading && !isError && chats.length === 0 ? (
                <SidebarMenuItem>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm">
                    No chats found.
                  </div>
                </SidebarMenuItem>
              ) : null}

              {chats.map((chat) => (
                <ChatItem key={chat.id} chat={chat} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
