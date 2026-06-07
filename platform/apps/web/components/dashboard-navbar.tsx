"use client";
import { Button } from "@repo/ui/components/button";
import { useSidebar } from "@repo/ui/components/sidebar";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function DashboardNavbar() {
  const { toggleSidebar, state } = useSidebar();
  return (
    <div className="bg-background fixed top-0 z-10 flex h-14 w-full items-center border-b">
      <div className="flex w-full items-center justify-between px-3">
        <Link href="/dashboard">
          <h2 className="text-lg font-bold">VOG </h2>
        </Link>

        <div className="flex items-center gap-1">
          <LogoutButton />
          <Button
            variant={"ghost"}
            className="md:hidden"
            onClick={toggleSidebar}
          >
            {state === "expanded" ? <Menu /> : <X />}
          </Button>
        </div>
      </div>
    </div>
  );
}
