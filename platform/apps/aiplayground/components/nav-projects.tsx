"use client";

import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { useGetInstances } from "@/hooks/use-instance";
import { useGetProjectDomainsById } from "@/hooks/use-project";
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
    projectId: string;
  }[];
};

type ProjectSessionNavItemProps = {
  session: Project["sessions"][number];
  isResumePending: boolean;
  onResume: (sessionId: string) => void;
};

function ProjectSessionNavItem({
  session,
  isResumePending,
  onResume,
}: ProjectSessionNavItemProps) {
  const pathname = usePathname();
  const {
    data: instancesData,
    isPending: isInstancePending,
    isError: isInstanceError,
  } = useGetInstances({
    sessionId: session.id,
    state: "running",
    limit: 1,
  });
  const instance = instancesData?.data[0];
  const { data: domainsData } = useGetProjectDomainsById(
    session.projectId,
    !!instance,
  );
  const opencodeDomain =
    instance && domainsData?.target_instance_id === instance.id
      ? domainsData.proxy_domains.find((domain) => domain.target_port === 4096)
          ?.domain
      : undefined;
  const sessionUrl = opencodeDomain
    ? `/projects/${session.projectId}/chats/${session.id}?serverUrl=${encodeURIComponent(`https://${opencodeDomain}`)}`
    : null;

  return (
    <SidebarMenuSubItem>
      <div className="flex items-center gap-1">
        <SidebarMenuSubButton
          asChild={!!sessionUrl}
          isActive={!!sessionUrl && pathname === sessionUrl.split("?")[0]}
          className="min-w-0 flex-1"
        >
          {sessionUrl ? (
            <Link href={sessionUrl}>
              <SquareTerminal />
              <span className="min-w-0 flex-1 truncate" title={session.name}>
                {session.name}
              </span>
              <span
                className="ml-auto size-2 shrink-0 rounded-full bg-emerald-500"
                title="Running"
              >
                <span className="sr-only">Running</span>
              </span>
            </Link>
          ) : (
            <span>
              <SquareTerminal />
              <span className="min-w-0 flex-1 truncate" title={session.name}>
                {session.name}
              </span>
              {instance ? (
                <span
                  className="ml-auto size-2 shrink-0 rounded-full bg-amber-500"
                  title="OpenCode domain unavailable"
                >
                  <span className="sr-only">OpenCode domain unavailable</span>
                </span>
              ) : null}
            </span>
          )}
        </SidebarMenuSubButton>
        {!isInstancePending && !isInstanceError && !instance ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 shrink-0 px-2"
            disabled={isResumePending}
            onClick={() => onResume(session.id)}
          >
            <Play />
            Resume
          </Button>
        ) : null}
      </div>
    </SidebarMenuSubItem>
  );
}

export function NavProjects({ projects }: { projects: Project[] }) {
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
                        <ProjectSessionNavItem
                          key={session.id}
                          session={session}
                          isResumePending={resumeSession.isPending}
                          onResume={setRuntimeDialogSessionId}
                        />
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
