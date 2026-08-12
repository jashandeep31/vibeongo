"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar-v2";
import type { LucideIcon } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    warningCount?: number;
    onSelect?: () => void;
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={
              item.isActive ??
              (item.url === "/"
                ? pathname === item.url
                : pathname.startsWith(item.url))
            }
            className="h-9 rounded-xl px-3 text-sm font-normal"
          >
            <Link
              href={item.url}
              onClick={() => {
                item.onSelect?.();
                closeMobileSidebar();
              }}
            >
              <item.icon />
              <span>{item.title}</span>
              {item.warningCount ? (
                <span
                  className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] leading-none font-medium text-amber-700 dark:text-amber-300"
                  title={`${item.warningCount} repositories need a default project`}
                  aria-label={`${item.warningCount} repositories need a default project`}
                >
                  <TriangleAlert className="size-3" />
                  {item.warningCount}
                </span>
              ) : null}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
