"use client";

import * as React from "react";

import { cn } from "@repo/ui/lib/utils";
import {
  SidebarMenuButton as BaseSidebarMenuButton,
  SidebarMenuSubButton as BaseSidebarMenuSubButton,
} from "@repo/ui/components/sidebar";

const inactiveItemStyles =
  "data-[active=false]:bg-transparent! data-[active=false]:font-normal! data-[active=false]:text-sidebar-foreground! hover:data-[active=false]:bg-sidebar-accent! hover:data-[active=false]:text-sidebar-accent-foreground!";

function SidebarMenuButton({
  isActive = false,
  className,
  ...props
}: React.ComponentProps<typeof BaseSidebarMenuButton>) {
  return (
    <BaseSidebarMenuButton
      isActive={isActive}
      className={cn(!isActive && inactiveItemStyles, className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  isActive = false,
  className,
  ...props
}: React.ComponentProps<typeof BaseSidebarMenuSubButton>) {
  return (
    <BaseSidebarMenuSubButton
      isActive={isActive}
      className={cn(!isActive && inactiveItemStyles, className)}
      {...props}
    />
  );
}

export * from "@repo/ui/components/sidebar";
export { SidebarMenuButton, SidebarMenuSubButton };
