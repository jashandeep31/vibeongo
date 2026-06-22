"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const adminCommands = [
  { label: "Admin Home", href: "/" },
  { label: "Users", href: "/users" },
  { label: "Regions", href: "/regions" },
] as const;

const awsCommands = [
  { label: "AWS Images", href: "/aws/images" },
  { label: "AWS Instances", href: "/aws/instances" },
] as const;

const NavCommandBox = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((currentOpen) => !currentOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="min-w-125">
      <Command>
        <CommandInput placeholder="Type a command or search admin pages..." />
        <CommandList>
          <CommandEmpty>No admin page found.</CommandEmpty>
          <CommandGroup heading="Admin">
            {adminCommands.map((command) => (
              <CommandItem
                className="p-1 text-sm"
                key={command.label}
                onSelect={() => runCommand(command.href)}
              >
                {command.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="AWS">
            {awsCommands.map((command) => (
              <CommandItem
                className="p-1 text-sm"
                key={command.label}
                onSelect={() => runCommand(command.href)}
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
