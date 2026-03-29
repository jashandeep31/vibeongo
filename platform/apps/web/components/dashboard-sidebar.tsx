import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import {
  ArrowUpRight,
  CreditCard,
  Github,
  LucideIcon,
  PlusCircle,
  Settings,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";

const sidebarLinks: {
  title: string;
  icon: LucideIcon;
  url: string;
  external?: boolean;
}[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: FolderOpen,
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
    title: "Billing",
    url: "/billing",
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
                    <Link
                      href={item.url}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {item.external && (
                        <ArrowUpRight className="text-muted-foreground h-4 w-4" />
                      )}
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
