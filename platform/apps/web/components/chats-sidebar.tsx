"use client";

import { useGetChats } from "@/hooks/use-chats";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
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
  PlusCircle,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";

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
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                  >
                    <Link
                      href={`/chats/${chat.id}`}
                      onClick={closeMobileSidebar}
                    >
                      <MessageSquare />
                      <span>{chat.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
