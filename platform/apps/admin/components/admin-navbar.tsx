"use client";

import { adminNavItems } from "@/components/admin-nav-links";
import { Button } from "@repo/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/components/sheet";
import { cn } from "@repo/ui/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../app/(root)/logout-button";

const isActivePath = (pathname: string, href: string) => {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
};

const AdminNavbar = () => {
  const pathname = usePathname();

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-sm font-medium text-muted-foreground">
            Admin
          </span>
          <span className="text-base font-semibold text-foreground">
            Vibeongo
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {adminNavItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Button
                key={item.href}
                asChild
                size="sm"
                variant={active ? "secondary" : "ghost"}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <LogoutButton />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 max-w-[85vw]">
            <SheetHeader>
              <SheetTitle>Admin navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {adminNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
            <div className="mt-auto border-t p-4">
              <LogoutButton />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default AdminNavbar;
