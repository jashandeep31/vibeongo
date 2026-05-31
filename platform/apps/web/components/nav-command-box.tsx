"use client";
import { useEffect, useMemo, useState } from "react";
import { useGetProjects } from "@/hooks/use-project";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";
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
  const [open, setOpen] = useState(false);
  const {
    data: projects,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useGetProjects(open);
  const {
    data: sessions,
    isLoading: isSessionsLoading,
    error: sessionsError,
  } = useGetProjectSessions({ page: 1, limit: 100 }, open);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runningSessions = useMemo(
    () =>
      (sessions?.data ?? []).filter(
        (session) => (session.instances?.length ?? 0) > 0,
      ),
    [sessions?.data],
  );

  const commandsList: { label: string; href: string; external?: boolean }[] = [
    { label: "Dashboard (Home)", href: "/dashboard" },
    { label: "My Projects", href: "/projects" },
    { label: "Create Project", href: "/dashboard/project/create" },
    { label: "Sessions", href: "/dashboard/sessions" },
    { label: "Repos", href: "/dashboard/repos" },
    { label: "Wallet", href: "/dashboard/wallet" },
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
          <CommandGroup heading="Projects">
            {isProjectsLoading && (
              <CommandItem disabled className="p-1 text-sm">
                Loading projects...
              </CommandItem>
            )}
            {projectsError && (
              <CommandItem disabled className="text-destructive p-1 text-sm">
                Error loading projects.
              </CommandItem>
            )}
            {!isProjectsLoading && !projectsError && projects?.length === 0 && (
              <CommandItem disabled className="p-1 text-sm">
                No projects found.
              </CommandItem>
            )}
            {projects?.map((project) => (
              <CommandItem
                className="p-1 text-sm"
                key={project.id}
                onSelect={() => {
                  router.push(`/projects/${project.id}`);
                  setOpen(false);
                }}
              >
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Running Sessions">
            {isSessionsLoading && (
              <CommandItem disabled className="p-1 text-sm">
                Loading sessions...
              </CommandItem>
            )}
            {sessionsError && (
              <CommandItem disabled className="text-destructive p-1 text-sm">
                Error loading sessions.
              </CommandItem>
            )}
            {!isSessionsLoading &&
              !sessionsError &&
              runningSessions.length === 0 && (
                <CommandItem disabled className="p-1 text-sm">
                  No running sessions found.
                </CommandItem>
              )}
            {runningSessions.map((session) => (
              <CommandItem
                className="p-1 text-sm"
                key={session.id}
                onSelect={() => {
                  router.push(`/dashboard/sessions/${session.id}`);
                  setOpen(false);
                }}
              >
                {session.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default NavCommandBox;
