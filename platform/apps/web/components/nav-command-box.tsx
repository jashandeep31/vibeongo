"use client";
import React from "react";
import {
  Command,
  CommandInput,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import { useRouter } from "next/navigation";
const NavCommandBox = () => {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const commandsList: { label: string; href: string; external?: boolean }[] = [
    { label: "Dashboard (Home)", href: "/dashboard" },
    { label: "My Projects", href: "/projects" },
    { label: "Create Project", href: "/dashboard/project/create" },
    { label: "Sessions", href: "/dashboard/sessions" },
    { label: "Repos", href: "/dashboard/repos" },
    { label: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="min-w-125">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            {commandsList.map((command) => (
              <CommandItem
                className="p-1 text-sm"
                key={command.label}
                onSelect={() => {
                  if (command.external) {
                    window.open(command.href, "_blank", "noopener,noreferrer");
                  } else {
                    router.push(command.href);
                  }
                  setOpen(false);
                }}
              >
                {command.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default NavCommandBox;
