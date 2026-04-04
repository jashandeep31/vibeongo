"use client";

import { useState } from "react";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  useCreateInstance,
  useGetInstancesByProjectId,
} from "@/hooks/use-instance";
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

type InstanceFilter = "running" | "terminated" | "pending" | "all";

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

export default function ClientView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isLoading, isError } = useGetProjectById(projectId);
  const {
    data: instances,
    isLoading: isInstancesLoading,
    isError: isInstancesError,
    refetch: refetchInstances,
  } = useGetInstancesByProjectId(projectId);
  const deleteProjectMutation = useDeleteProject();
  const { mutateAsync: createInstance } = useCreateInstance();
  const [instanceFilter, setInstanceFilter] =
    useState<InstanceFilter>("running");

  const handleCreate = async () => {
    const toastId = toast.loading("Creating the new instance");
    try {
      await createInstance({ projectId: projectId });
      await refetchInstances();
      toast.success("created", { id: toastId });
    } catch {
      toast.error("failed", { id: toastId });
    }
  };

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
    return <div className="text-muted-foreground p-8">Loading project...</div>;
  }

  if (isError || !project) {
    return (
      <div className="p-8">
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4">
          Failed to load project details.
        </div>
      </div>
    );
  }

  const projectInstances = Array.isArray(instances) ? instances : [];
  const filteredInstances = projectInstances.filter((instance) => {
    if (instanceFilter === "all") {
      return true;
    }

    if (instanceFilter === "terminated") {
      return instance.state === "terminated" || !!instance.terminated_at;
    }

    return instance.state === instanceFilter;
  });

  return (
    <div className="space-y-8 p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                void handleCreate();
              }}
            >
              Create Instance
            </Button>
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
              <p className="font-medium">{project.total_charges}</p>
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
              ["running", "terminated", "pending", "all"] as InstanceFilter[]
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
        ) : filteredInstances.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              No {instanceFilter === "all" ? "" : `${instanceFilter} `}
              instances found for this project.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredInstances.map((instance) => (
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
  );
}
