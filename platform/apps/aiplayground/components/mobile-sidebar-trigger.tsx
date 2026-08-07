"use client";

import {
  SidebarTrigger,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";

export function MobileSidebarTrigger() {
  const { openMobile } = useSidebar();

  if (openMobile) return null;

  return <SidebarTrigger className="fixed top-3 left-3 z-[60] md:hidden" />;
}
