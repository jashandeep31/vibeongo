"use client";

import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { useUserMetadata } from "@/hooks/use-user";
import { logout } from "@/services/auth-services";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
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
  PlusCircle,
  Settings,
  FolderOpen,
  Home,
  GitFork,
  LogOut,
  MessageSquare,
  MoreVertical,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type SidebarUser = {
  name: string;
  username: string;
  balance: number;
};

function NavUser({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const initials =
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const walletBalance = (
    Math.trunc((user.balance / 10000) * 100) / 100
  ).toFixed(2);

  const handleLogout = async () => {
    try {
      await logout();
      setOpenMobile(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="rounded-lg">
                <AvatarImage
                  src={`https://github.com/${user.username}.png`}
                  alt={user.name}
                />
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm">
                <span className="truncate font-medium">{user.name}</span>
              </div>
              <MoreVertical className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="rounded-lg">
                  <AvatarImage
                    src={`https://github.com/${user.username}.png`}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    @{user.username}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/wallet">
                <Wallet />
                <span>Wallet balance</span>
                <span className="ml-auto font-medium">
                  ${walletBalance} credits
                </span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void handleLogout();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

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
          <NavUser
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
