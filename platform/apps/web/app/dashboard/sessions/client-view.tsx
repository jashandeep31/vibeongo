"use client";

import { useState } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";

const SESSIONS_LIMIT = 10;

export default function ClientView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetProjectSessions({
    page,
    limit: SESSIONS_LIMIT,
  });

  return (
    <div className="p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Review all sessions and their currently running instances.
        </p>
      </div>

      <div className="mt-8">
        <ProjectSessionsList
          sessions={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
        />
        <PaginationControls
          className="mt-4 flex items-center justify-end gap-2"
          page={data?.page ?? page}
          hasNext={data?.hasNext}
          isLoading={isLoading}
          onPrevious={() => {
            setPage((currentPage) => Math.max(1, currentPage - 1));
          }}
          onNext={() => {
            setPage((currentPage) => currentPage + 1);
          }}
        />
      </div>
    </div>
  );
}
