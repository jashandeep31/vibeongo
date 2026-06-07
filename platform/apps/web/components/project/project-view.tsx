"use client";
import { useState } from "react";
import { ProjectHeader } from "./project-header";
import { UsageBilling } from "./usage-billing";
import { ProjectViewSkeleton } from "./project-view-skeleton";
import { useDeleteProject, useGetProjectById } from "@/hooks/use-project";
import { useGetInstances } from "@/hooks/use-instance";
import type { ProjectInstanceStateFilter } from "@/services/instance-services";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { PaginationControls } from "@/components/pagination-controls";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

import { Project } from "./types";

type InstanceFilter = ProjectInstanceStateFilter;
const PROJECT_INSTANCES_LIMIT = 10;
const PROJECT_SESSIONS_LIMIT = 10;

export function ProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [instancePage, setInstancePage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [instanceFilter, setInstanceFilter] =
    useState<InstanceFilter>("running");
  const deleteProjectMutation = useDeleteProject();
  const { data: projectRaw, isLoading: isProjectLoading } =
    useGetProjectById(projectId);

  const {
    data: instancesData,
    isLoading: isInstanceLoading,
    isError: isInstancesError,
  } = useGetInstances({
    projectId,
    state: instanceFilter,
    page: instancePage,
    limit: PROJECT_INSTANCES_LIMIT,
  });

  const {
    data: sessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
  } = useGetProjectSessions({
    projectId,
    page: sessionPage,
    limit: PROJECT_SESSIONS_LIMIT,
    archived: false,
  });

  if (isProjectLoading) {
    return <ProjectViewSkeleton />;
  }

  if (!projectRaw) {
    return (
      <div className="p-4 text-center text-red-500 md:p-8">
        Failed to load project.
      </div>
    );
  }

  const project = projectRaw as unknown as Project;
  const instances = instancesData?.data ?? [];
  const projectSessions = (sessions?.data ?? []).filter(
    (session) => !session.archived,
  );

  const handleDelete = async () => {
    const toastId = toast.loading("Deleting project...");

    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast.success("Project deleted successfully", { id: toastId });
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete project")
        : "Failed to delete project";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-4 md:p-8">
      {/* Header Section */}
      <ProjectHeader project={project} />

      <div className="hidden justify-end">
        <ConfirmationDialog
          title="Delete project"
          description="Are you sure you want to delete this project? This action cannot be undone."
          confirmText="Delete"
          isDestructive
          onConfirm={handleDelete}
        >
          <Button
            variant="destructive"
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
          </Button>
        </ConfirmationDialog>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Side: Configuration (75%) */}
        <div className="space-y-6 lg:w-3/4">
          <div className="space-y-4">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Instances
              </h2>
              <div className="flex flex-wrap gap-2">
                {(["running", "terminated", "all"] as InstanceFilter[]).map(
                  (filter) => (
                    <Button
                      key={filter}
                      type="button"
                      size="sm"
                      variant={
                        instanceFilter === filter ? "default" : "outline"
                      }
                      onClick={() => {
                        setInstanceFilter(filter);
                        setInstancePage(1);
                      }}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  ),
                )}
              </div>
            </div>

            {isInstanceLoading ? (
              <Card>
                <CardContent className="text-muted-foreground py-8 text-center">
                  Loading instances...
                </CardContent>
              </Card>
            ) : isInstancesError ? (
              <Card>
                <CardContent className="text-destructive py-8 text-center">
                  Failed to load instances.
                </CardContent>
              </Card>
            ) : instances.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground py-8 text-center">
                  No {instanceFilter === "all" ? "" : `${instanceFilter} `}
                  instances found for this project.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {instances.map((instance) => (
                  <ProjectInstanceCard
                    key={instance.id}
                    instance={{
                      ...instance,
                      project: {
                        id: project.id,
                        name: project.name,
                        user_id: project.user_id,
                      },
                    }}
                    projectId={project.id}
                  />
                ))}
              </div>
            )}
            <PaginationControls
              page={instancesData?.page ?? instancePage}
              hasNext={instancesData?.hasNext}
              isLoading={isInstanceLoading}
              onPrevious={() => {
                setInstancePage((page) => Math.max(1, page - 1));
              }}
              onNext={() => {
                setInstancePage((page) => page + 1);
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Sessions
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Project sessions and their currently running instances.
              </p>
            </div>

            <ProjectSessionsList
              sessions={projectSessions}
              isLoading={isSessionsLoading}
              isError={isSessionsError}
            />
            <PaginationControls
              page={sessions?.page ?? sessionPage}
              hasNext={sessions?.hasNext}
              isLoading={isSessionsLoading}
              onPrevious={() => {
                setSessionPage((page) => Math.max(1, page - 1));
              }}
              onNext={() => {
                setSessionPage((page) => page + 1);
              }}
            />
          </div>
        </div>

        {/* Right Side: Usage & Billing (25%) */}
        <div className="space-y-6 lg:w-1/4">
          <UsageBilling project={project} instances={instances} />
        </div>
      </div>
      {/* <pre className="text-xs">{JSON.stringify(project.config, null, 2)}</pre> */}
    </div>
  );
}
