"use client";

import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/dashboard/settings/ssh-keys",
    label: "SSH Keys",
  },
  {
    href: "/dashboard/settings/auth-tokens",
    label: "Auth Keys",
  },
] as const;

export function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
