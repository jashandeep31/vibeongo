"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  ArrowUpRight,
  Clock3,
  CreditCard,
  Github,
  LucideIcon,
  PlusCircle,
  Settings,
  FolderOpen,
  Home,
  GitFork,
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
  {
    title: "GitHub",
    url: "https://github.com",
    icon: Github,
    external: true,
  },
] as const;

export function DashboardSidebar() {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const navigateTo = (url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }

    router.push(url);
  };

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
                    className="active:bg-background data-active:bg-background cursor-pointer"
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
                        <span>{item.title}</span>
                      </button>
                    )}
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
