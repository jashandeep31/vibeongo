"use client";

import { Button } from "@repo/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type FileManagementSidebarProps = {
  currentPath?: string;
  children: ReactNode;
};

export function FileManagementSidebar({
  currentPath,
  children,
}: FileManagementSidebarProps) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar side="left" collapsible="offcanvas">
      <style>{`
        [data-sidebar="sidebar"][data-mobile="true"]:has([data-file-management-sidebar]) {
          --sidebar-width: 100vw !important;
          width: 100vw !important;
          min-width: 100vw !important;
          max-width: none !important;
        }
      `}</style>
      <SidebarHeader
        data-file-management-sidebar
        className="border-sidebar-border flex-row items-start justify-between gap-3 border-b px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium">Files</p>
          <p className="text-sidebar-foreground/60 truncate font-mono text-xs">
            {currentPath ?? "Loading workspace…"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close file browser"
          title="Close file browser"
          onClick={() => setOpenMobile(false)}
        >
          <X />
        </Button>
      </SidebarHeader>
      <SidebarContent>{children}</SidebarContent>
    </Sidebar>
  );
}
