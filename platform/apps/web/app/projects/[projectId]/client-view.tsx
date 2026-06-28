"use client";

import { useState } from "react";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { ProjectSessionsList } from "@/components/project-sessions/project-sessions-list";
import { PaginationControls } from "@/components/pagination-controls";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { CreateInstanceDialog } from "@/components/dialogs/create-instance-dialog";
import { ProjectLoadingSkeleton } from "./project-loading-skeleton";
import { useGetInstances } from "@/hooks/use-instance";
import type { ProjectInstanceStateFilter } from "@/services/instance-services";
import { useDeleteProject, useGetProjectById } from "@/hooks/use-project";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  FileCode2,
  MoreHorizontal,
  Rocket,
  Settings,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { useGetProjectSessions } from "@/hooks/use-project-sessions";

type InstanceFilter = ProjectInstanceStateFilter;
const PROJECT_INSTANCES_LIMIT = 10;
const PROJECT_SESSIONS_LIMIT = 10;

const getInstanceEmptyCopy = (filter: InstanceFilter) => {
  if (filter === "running") {
    return {
      title: "No running instances",
      description:
        "Launch an instance when you are ready to run this project, open terminals, or preview exposed domains.",
    };
  }

  if (filter === "terminated") {
    return {
      title: "No terminated instances",
      description:
        "Stopped instances will appear here after you terminate project work.",
    };
  }

  return {
    title: "No instances yet",
    description:
      "This project has not launched any instances. Start one to create a live workspace.",
  };
};

export default function ClientView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [instancePage, setInstancePage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [instanceFilter, setInstanceFilter] =
    useState<InstanceFilter>("running");
  const { data: project, isLoading, isError } = useGetProjectById(projectId);
  const {
    data: instances,
    isLoading: isInstancesLoading,
    isError: isInstancesError,
    refetch: refetchInstances,
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
    return <ProjectLoadingSkeleton />;
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

  const projectInstances = instances?.data ?? [];
  const projectSessions = sessions?.data ?? [];
  const totalCharges = (project.total_charges / 10000).toFixed(2);
  const instanceEmptyCopy = getInstanceEmptyCopy(instanceFilter);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.description ? (
              <p className="text-muted-foreground mt-2">
                {project.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateInstanceDialog
              projectId={projectId}
              projectName={project.name}
              triggerLabel="Launch Instance"
              triggerIcon={<Rocket className="h-4 w-4" />}
              onSuccess={() => {
                void refetchInstances();
                void refetchSessions();
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Project menu">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-muted-foreground flex items-center justify-between gap-3 text-xs font-normal">
                  <span>Total charges</span>
                  <span className="text-foreground font-medium">
                    ${totalCharges}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/project/${projectId}/edit`}>
                    <Settings className="h-4 w-4" />
                    Edit Config
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/project/${projectId}/manage/env`}>
                    <FileCode2 className="h-4 w-4" />
                    Edit Envs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <ConfirmationDialog
                  title="Delete project"
                  description="Are you sure you want to delete this project? This action cannot be undone."
                  confirmText="Delete"
                  isDestructive
                  onConfirm={handleDeleteProject}
                >
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={deleteProjectMutation.isPending}
                    onSelect={(event) => {
                      event.preventDefault();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteProjectMutation.isPending
                      ? "Deleting..."
                      : "Delete Project"}
                  </DropdownMenuItem>
                </ConfirmationDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["running", "terminated", "all"] as InstanceFilter[]).map(
            (filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={instanceFilter === filter ? "default" : "outline"}
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
          <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
            <h3 className="text-foreground text-lg font-medium">
              {instanceEmptyCopy.title}
            </h3>
            <p className="mt-1 text-sm">{instanceEmptyCopy.description}</p>
            {instanceFilter === "running" ? (
              <div className="mt-4">
                <CreateInstanceDialog
                  projectId={projectId}
                  projectName={project.name}
                  triggerLabel="Launch instance"
                  triggerIcon={<Rocket className="h-4 w-4" />}
                  onSuccess={() => {
                    void refetchInstances();
                    void refetchSessions();
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projectInstances.map((instance) => (
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
          page={instances?.page ?? instancePage}
          hasNext={instances?.hasNext}
          isLoading={isInstancesLoading}
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
          <h2 className="text-2xl font-semibold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Project sessions and their currently running instances.
          </p>
        </div>

        <ProjectSessionsList
          sessions={projectSessions}
          isLoading={isSessionsLoading}
          isError={isSessionsError}
          emptyTitle="No project sessions"
          emptyDescription="Sessions track task context separately from live instances. Create or resume work to see that history here."
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
