"use client";

import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";

export default function ClientView() {
  const { data, isLoading, isError } = useGetProjectSessions();

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Review all sessions and their currently running instances.
        </p>
      </div>

      <div className="mt-8">
        <ProjectSessionsList
          sessions={data ?? []}
          isLoading={isLoading}
          isError={isError}
        />
      </div>
    </div>
  );
}
