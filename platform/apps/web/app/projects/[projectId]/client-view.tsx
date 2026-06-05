"use client";

import { useState } from "react";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { PaginationControls } from "@/components/pagination-controls";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateInstanceDialog } from "@/components/dialogs/create-instance-dialog";
import { useGetInstancesByProjectId } from "@/hooks/use-instance";
import type { ProjectInstanceStateFilter } from "@/services/instance-services";
import { useDeleteProject, useGetProjectById } from "@/hooks/use-project";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";

type InstanceFilter = ProjectInstanceStateFilter;
const PROJECT_SESSIONS_LIMIT = 10;

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

export default function ClientView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [sessionPage, setSessionPage] = useState(1);
  const [instanceFilter, setInstanceFilter] =
    useState<InstanceFilter>("running");
  const { data: project, isLoading, isError } = useGetProjectById(projectId);
  const {
    data: instances,
    isLoading: isInstancesLoading,
    isError: isInstancesError,
    refetch: refetchInstances,
  } = useGetInstancesByProjectId(projectId, instanceFilter);

  const {
    data: sessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions,
  } = useGetProjectSessions({
    projectId,
    page: sessionPage,
    limit: PROJECT_SESSIONS_LIMIT,
  });

  const deleteProjectMutation = useDeleteProject();

  const handleDeleteProject = async () => {
    const toastId = toast.loading("Deleting project...");
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast.success("Project deleted successfully", { id: toastId });
      router.push("/projects");
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to delete project")
        : "Failed to delete project";
      toast.error(message, { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-4 md:p-8">
        Loading project...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-4 md:p-8">
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4">
          Failed to load project details.
        </div>
      </div>
    );
  }

  const projectInstances = Array.isArray(instances) ? instances : [];
  const projectSessions = sessions?.data ?? [];

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2">
            <CreateInstanceDialog
              projectId={projectId}
              projectName={project.name}
              onSuccess={() => {
                void refetchInstances();
                void refetchSessions();
              }}
            />
            <ConfirmationDialog
              title="Delete project"
              description="Are you sure you want to delete this project? This action cannot be undone."
              confirmText="Delete"
              isDestructive
              onConfirm={handleDeleteProject}
            >
              <Button
                variant="destructive"
                disabled={deleteProjectMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deleteProjectMutation.isPending
                  ? "Deleting..."
                  : "Delete Project"}
              </Button>
            </ConfirmationDialog>
          </div>
        </div>
        <p className="text-muted-foreground mt-2">
          {project.description || "No description provided."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>
            Basic details and metadata for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Total Charges</p>
              <p className="font-medium">${project.total_charges / 10000}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created At</p>
              <p className="font-medium">{formatDate(project.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Updated At</p>
              <p className="font-medium">{formatDate(project.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Instances</h2>
          <div className="flex flex-wrap gap-2">
            {(
              ["running", "terminated", "all"] as InstanceFilter[]
            ).map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={instanceFilter === filter ? "default" : "outline"}
                onClick={() => {
                  setInstanceFilter(filter);
                }}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isInstancesLoading ? (
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
        ) : projectInstances.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              No {instanceFilter === "all" ? "" : `${instanceFilter} `}
              instances found for this project.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projectInstances.map((instance) => (
              <ProjectInstanceCard
                key={instance.id}
                instance={instance}
                projectId={project.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Sessions</h2>
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
  );
}
