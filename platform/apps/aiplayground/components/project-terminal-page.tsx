"use client";

import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { ArrowLeft, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectTerminalPage({
  projectId,
  projectSessionId,
}: {
  projectId: string;
  projectSessionId: string;
}) {
  const router = useRouter();
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionName = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.session.name ?? "Session",
  );

  return (
    <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Go back"
          title="Go back"
          onClick={() => router.back()}
        >
          <ArrowLeft />
        </Button>
        <Terminal className="text-muted-foreground size-4 shrink-0" />
        <h1 className="min-w-0 truncate text-sm font-semibold">
          {projectName} · {sessionName} · Terminal
        </h1>
      </header>

      <main className="min-h-0 flex-1" aria-label="Terminal workspace" />
    </div>
  );
}
