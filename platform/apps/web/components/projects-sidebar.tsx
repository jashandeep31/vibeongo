"use client";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useGetProjects } from "@/hooks/use-project";
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
  ArrowUpRight,
  ChevronRight,
  Clock3,
  CreditCard,
  GitFork,
  LucideIcon,
  PlusCircle,
  Server,
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
  external?: boolean;
}[] = [
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
] as const;

export function ProjectsSidebar() {
  const { data: projects } = useGetProjects();
  const { data: repos } = useGetGithubRepos();
  const { isMobile, setOpenMobile } = useSidebar();
  const reposWithNoDefaultProject = repos?.filter((r) => !r.default_project_id);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="">
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
                            {item.external ? (
                              <Link
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={closeMobileSidebar}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                                <ArrowUpRight className="text-muted-foreground ml-auto h-4 w-4" />
                              </Link>
                            ) : (
                              <Link
                                href={item.url}
                                onClick={closeMobileSidebar}
                              >
                                <item.icon />
                                <span>{item.title}</span>
                                {item.title === "Repos" &&
                                (reposWithNoDefaultProject?.length ?? 0) > 0 ? (
                                  <span className="ml-auto rounded-full bg-yellow-500 px-1.5 py-0.5 text-xs text-white">
                                    {reposWithNoDefaultProject?.length}
                                  </span>
                                ) : null}
                              </Link>
                            )}
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
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((server) => (
                <SidebarMenuItem key={server.id}>
                  <SidebarMenuButton
                    asChild
                    className="text-sidebar-foreground hover:text-sidebar-foreground active:bg-background active:text-sidebar-foreground data-active:bg-background data-active:text-sidebar-foreground cursor-pointer"
                  >
                    <Link
                      href={`/projects/${server.id}`}
                      onClick={closeMobileSidebar}
                    >
                      <Server className="h-4 w-4" />
                      <span>{server.name}</span>
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
