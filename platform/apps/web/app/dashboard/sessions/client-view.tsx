"use client";

import { useState } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";
import { Button } from "@repo/ui/components/button";

const SESSIONS_LIMIT = 10;

export default function ClientView() {
  const [page, setPage] = useState(1);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const { data, isLoading, isError } = useGetProjectSessions({
    page,
    limit: SESSIONS_LIMIT,
    archived: isArchivedView,
  });

  const handleFilterChange = (archived: boolean) => {
    setIsArchivedView(archived);
    setPage(1);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Sessions
          </h1>
          <p className="text-muted-foreground mt-2">
            Review all sessions and their currently running instances.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={!isArchivedView ? "default" : "outline"}
            onClick={() => handleFilterChange(false)}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isArchivedView ? "default" : "outline"}
            onClick={() => handleFilterChange(true)}
          >
            Archived
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <ProjectSessionsList
          sessions={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          isArchivedView={isArchivedView}
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
