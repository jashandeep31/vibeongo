"use client";

import { SidebarTrigger, useSidebar } from "@repo/ui/components/sidebar-v2";
import { cn } from "@repo/ui/lib/utils";

export function MobileSidebarTrigger({ className }: { className?: string }) {
  const { openMobile } = useSidebar();

  if (openMobile) return null;

  return (
    <SidebarTrigger
      className={cn("fixed top-3 left-3 z-[60] md:hidden", className)}
    />
  );
}
