"use client";

import {
  ProjectSessionRuntimeDialog,
  type ProjectSessionRuntime,
} from "@/components/dialogs/project-session-runtime-dialog";
import { useResumeProjectSession } from "@/hooks/use-project-sessions";
import { useProjectsStore, useSessionsStore } from "@/store/playground-store";
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import { ChevronDown, Loader2, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type SessionEntry = ReturnType<
  typeof useSessionsStore.getState
>["sessions"][number];

function getRunningSessionUrl(entry: SessionEntry) {
  if (!entry.instance) return null;

  const serverUrl = `https://4096-${entry.instance.id}${entry.instance.proxy_domain}`;
  const params = new URLSearchParams({ serverUrl });
  return `/projects/${entry.session.project_id}/chats/${entry.session.id}?${params.toString()}`;
}

function SessionRow({
  entry,
  isResumePending,
  onResume,
}: {
  entry: SessionEntry;
  isResumePending: boolean;
  onResume: (sessionId: string) => void;
}) {
  const runningUrl = getRunningSessionUrl(entry);

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-medium" title={entry.session.name}>
            {entry.session.name}
          </h3>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              className={`size-1.5 rounded-full ${
                entry.state === "running"
                  ? "bg-emerald-500"
                  : entry.state === "processing"
                    ? "animate-pulse bg-amber-500"
                    : "bg-muted-foreground/50"
              }`}
            />
            {entry.state === "running"
              ? "Running"
              : entry.state === "processing"
                ? "Starting"
                : "Paused"}
          </span>
        </div>
      </div>

      {entry.state === "running" && runningUrl ? (
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href={runningUrl}>Open</Link>
        </Button>
      ) : entry.state === "processing" ? (
        <Button disabled variant="ghost" size="sm" className="shrink-0">
          <Loader2 className="animate-spin" />
          Starting
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={isResumePending}
          onClick={() => onResume(entry.session.id)}
        >
          {isResumePending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play />
          )}
          Resume
        </Button>
      )}
    </div>
  );
}

export default function ClientView() {
  const projects = useProjectsStore((store) => store.projects);
  const sessions = useSessionsStore((store) => store.sessions);
  const resumeSession = useResumeProjectSession();
  const [runtimeDialogSessionId, setRuntimeDialogSessionId] = useState<
    string | null
  >(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null,
  );

  const handleRuntimeSelect = (runtime: ProjectSessionRuntime) => {
    if (!runtimeDialogSessionId) return;

    const sessionId = runtimeDialogSessionId;
    setRuntimeDialogSessionId(null);
    setResumingSessionId(sessionId);
    resumeSession.mutate(
      { id: sessionId, runtime },
      {
        onSuccess: () => toast.success("Session is starting"),
        onError: () => toast.error("Failed to resume session"),
        onSettled: () => setResumingSessionId(null),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Playground
        </h1>
      </header>

      <section className="mt-8" aria-labelledby="agent-heading">
        <button
          type="button"
          disabled
          className="bg-muted/50 flex w-full cursor-not-allowed items-center justify-between gap-4 rounded-lg px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span id="agent-heading" className="block text-sm font-medium">
              Talk to VibeOnGo agent
            </span>
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">
            Coming soon
          </span>
        </button>
      </section>

      <section className="mt-12" aria-labelledby="projects-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="projects-heading" className="text-base font-semibold">
              Your projects
            </h2>
          </div>
          {projects.length > 0 ? (
            <span className="text-muted-foreground text-sm tabular-nums">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <div className="bg-muted/40 rounded-lg px-4 py-10 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Your projects and sessions will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => {
              const projectSessions = sessions.filter(
                (entry) => entry.session.project_id === project.id,
              );
              const runningCount = projectSessions.filter(
                (entry) => entry.state === "running",
              ).length;
              return (
                <Collapsible key={project.id} defaultOpen={projects.length === 1}>
                  <div className="bg-muted/25 overflow-hidden rounded-lg">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="hover:bg-muted/50 group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {project.name}
                            </span>
                            {runningCount > 0 ? (
                              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {runningCount} running
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="text-muted-foreground hidden shrink-0 text-sm sm:block">
                          {projectSessions.length}{" "}
                          {projectSessions.length === 1 ? "session" : "sessions"}
                        </span>
                        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="space-y-2 px-3 pb-3">
                        {projectSessions.length === 0 ? (
                          <div className="text-muted-foreground px-3 py-6 text-center text-sm">
                            This project does not have any sessions yet.
                          </div>
                        ) : (
                          projectSessions.map((entry) => (
                            <SessionRow
                              key={entry.session.id}
                              entry={entry}
                              isResumePending={
                                resumingSessionId === entry.session.id
                              }
                              onResume={setRuntimeDialogSessionId}
                            />
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      <ProjectSessionRuntimeDialog
        open={runtimeDialogSessionId !== null}
        onOpenChange={(open) => {
          if (!open) setRuntimeDialogSessionId(null);
        }}
        onSelect={handleRuntimeSelect}
      />
    </div>
  );
}
