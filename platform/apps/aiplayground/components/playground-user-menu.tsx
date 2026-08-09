"use client";

import { useAuthenticatedUser } from "@/hooks/use-user";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { formatInternalMoney } from "@repo/shared";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import {
  MoreHorizontal,
  Settings,
  TriangleAlert,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

export function PlaygroundUserMenu() {
  const { data: user, isLoading, isError } = useAuthenticatedUser();
  const { isMobile, setOpenMobile } = useSidebar();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon className="h-12 rounded-xl" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (isError || !user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            disabled
            className="h-12 rounded-xl px-3"
          >
            <span className="bg-sidebar-accent flex size-8 items-center justify-center rounded-full">
              <UserRound className="size-4" />
            </span>
            <span className="text-muted-foreground text-sm">
              Profile unavailable
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const balance = formatInternalMoney(user.balance, 2);
  const isBalanceLow = user.balance < LOW_BALANCE_THRESHOLD;

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent h-14 rounded-xl px-2.5"
            >
              <Avatar className="size-9 rounded-xl">
                <AvatarImage
                  src={`https://github.com/${user.username}.png`}
                  alt={name}
                />
                <AvatarFallback className="rounded-xl text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  @{user.username}
                </span>
              </span>
              {isBalanceLow ? (
                <TriangleAlert
                  className="ml-auto size-4 text-amber-500"
                  aria-label="Low wallet balance"
                />
              ) : null}
              <MoreHorizontal
                className={
                  isBalanceLow
                    ? "text-muted-foreground"
                    : "text-muted-foreground ml-auto"
                }
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl p-1.5"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-2 font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-xl">
                  <AvatarImage
                    src={`https://github.com/${user.username}.png`}
                    alt={name}
                  />
                  <AvatarFallback className="rounded-xl text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    @{user.username}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>

            <div
              className={`mx-1 mb-1 rounded-lg px-3 py-2.5 ${
                isBalanceLow
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "bg-muted"
              }`}
            >
              <p className="text-muted-foreground text-xs">Available balance</p>
              <p className="mt-0.5 text-sm font-semibold">${balance} credits</p>
              {isBalanceLow ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium">
                  <TriangleAlert className="size-3.5" />
                  {user.balance <= 0
                    ? "No credits remaining"
                    : "Wallet balance is low"}
                </p>
              ) : null}
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg">
              <Link href="/wallet" onClick={closeMobileSidebar}>
                <WalletCards />
                Wallet
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg">
              <Link href="/settings" onClick={closeMobileSidebar}>
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
