"use client";
import { useState } from "react";
import { ProjectHeader } from "./project-header";
import { UsageBilling } from "./usage-billing";
import { ProjectViewSkeleton } from "./project-view-skeleton";
import { useDeleteProject, useGetProjectById } from "@/hooks/use-project";
import { useGetInstancesByProjectId } from "@/hooks/use-instance";
import type { ProjectInstanceStateFilter } from "@/services/instance-services";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

import { Project } from "./types";

type InstanceFilter = ProjectInstanceStateFilter;

export function ProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [instanceFilter, setInstanceFilter] =
    useState<InstanceFilter>("running");
  const deleteProjectMutation = useDeleteProject();
  const { data: projectRaw, isLoading: isProjectLoading } =
    useGetProjectById(projectId);

  const {
    data: instancesData,
    isLoading: isInstanceLoading,
    isError: isInstancesError,
  } = useGetInstancesByProjectId(projectId, instanceFilter);

  if (isProjectLoading || isInstanceLoading) {
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
  const instances = Array.isArray(instancesData) ? instancesData : [];

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
                    instance={instance}
                    projectId={project.id}
                  />
                ))}
              </div>
            )}
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
