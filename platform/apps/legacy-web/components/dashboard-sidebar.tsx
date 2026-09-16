"use client";

import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useUserMetadata } from "@/hooks/use-user";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import axios from "axios";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  Github,
  LucideIcon,
  Settings,
  FolderOpen,
  Home,
  GitFork,
  MessageSquare,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const sidebarLinks: {
  title: string;
  icon: LucideIcon;
  url: string;
  external?: boolean;
}[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },

  {
    title: "My Projects",
    url: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Create Project",
    url: "/dashboard/project/create",
    icon: Plus,
  },
  {
    title: "Chats",
    url: "/chats",
    icon: MessageSquare,
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
  {
    title: "GitHub",
    url: "https://github.com/jashandeep31",
    icon: Github,
    external: true,
  },
] as const;

export function DashboardSidebar() {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: repos } = useGetGithubRepos();
  const { data: user, error } = useUserMetadata();
  const isUnauthenticated =
    axios.isAxiosError(error) && error.response?.status === 401;

  // useEffect(() => {
  //   if (isUnauthenticated) {
  //     router.replace("/login");
  //   }
  // }, [isUnauthenticated, router]);

  const reposWithNoDefaultProject = repos?.filter((r) => !r.default_project_id);
  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : "";

  const navigateTo = (url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }

    router.push(url);
  };

  if (isUnauthenticated) {
    return null;
  }
  return (
    <Sidebar className="bg-background mt-14 h-[calc(100vh-56px)]">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                  >
                    {item.external ? (
                      <Link
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        <ArrowUpRight className="text-muted-foreground h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigateTo(item.url)}
                      >
                        <item.icon />
                        <span>
                          {item.title}{" "}
                          {(item.title === "Repos" &&
                            reposWithNoDefaultProject?.length) ||
                          0 > 0 ? (
                            <span className="rounded-full bg-yellow-500 p-2">
                              {reposWithNoDefaultProject?.length}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <SidebarUserMenu
            user={{
              name: userName || user.username,
              username: user.username,
              balance: user.balance,
            }}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
