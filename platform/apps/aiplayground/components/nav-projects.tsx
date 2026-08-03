"use client";

import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { useResumeProjectSession } from "@/hooks/use-project-sessions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@repo/ui/components/sidebar-v2";
import { Button } from "@repo/ui/components/button";
import { ChevronRight, Folder, Play, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Project = {
  id: string;
  name: string;
  url: string;
  sessions: {
    id: string;
    name: string;
    url: string;
    isRunning?: boolean;
  }[];
};

export function NavProjects({ projects }: { projects: Project[] }) {
  const pathname = usePathname();
  const resumeSession = useResumeProjectSession();
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);

  const handleRuntimeSelect = (runtime: ProjectSessionRuntime) => {
    if (!runtimeDialogSessionId) return;

    const sessionId = runtimeDialogSessionId;
    setRuntimeDialogSessionId(null);
    resumeSession.mutate({ id: sessionId, runtime });
  };

  return (
    <>
      <SidebarGroup className="px-2 py-3">
        <SidebarGroupLabel className="text-sidebar-foreground px-3 text-sm font-semibold">
          Projects
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
            {projects.map((project) => (
              <Collapsible
                key={project.id}
                defaultOpen
                className="group/project"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-9 rounded-xl px-3 font-normal">
                      <Folder />
                      <span>{project.name}</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/project:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {project.sessions.map((session) => (
                        <SidebarMenuSubItem key={session.id}>
                          <div className="flex items-center gap-1">
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === session.url}
                              className="min-w-0 flex-1"
                            >
                              <Link href={session.url}>
                                <SquareTerminal />
                                <span
                                  className="min-w-0 flex-1 truncate"
                                  title={session.name}
                                >
                                  {session.name}
                                </span>
                                {session.isRunning ? (
                                  <span
                                    className="ml-auto size-2 shrink-0 rounded-full bg-emerald-500"
                                    title="Running"
                                  >
                                    <span className="sr-only">Running</span>
                                  </span>
                                ) : null}
                              </Link>
                            </SidebarMenuSubButton>
                            {!session.isRunning ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 shrink-0 px-2"
                                disabled={resumeSession.isPending}
                                onClick={() =>
                                  setRuntimeDialogSessionId(session.id)
                                }
                              >
                                <Play />
                                Resume
                              </Button>
                            ) : null}
                          </div>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
    </>
  );
}
