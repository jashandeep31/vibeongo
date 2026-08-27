"use client";

import { SidebarTrigger, useSidebar } from "@repo/ui/components/sidebar-v2";
import { cn } from "@repo/ui/lib/utils";
import { useEffect } from "react";

export function MobileSidebarTrigger({ className }: { className?: string }) {
  const { openMobile, toggleSidebar } = useSidebar();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "b" ||
        !event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.repeat
      ) {
        return;
      }

      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  if (openMobile) return null;

  return (
    <SidebarTrigger
      className={cn("fixed top-3 left-3 z-[60] md:hidden", className)}
    />
  );
}
