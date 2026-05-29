"use client";
import { ProjectHeader } from "./project-header";
import { SystemInformation } from "./system-information";
import { ProjectTabs } from "./project-tabs";
import { UsageBilling } from "./usage-billing";
import { ProjectDomainsCard } from "./project-domains-card";
import {
  useAddAllowedIpToProject,
  useDeleteProject,
  useGetProjectById,
} from "@/hooks/use-project";
import { useGetInstancesByProjectId } from "@/hooks/use-instance";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Button } from "@repo/ui/components/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";

import { Project } from "./types";

export function ProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const deleteProjectMutation = useDeleteProject();
  const addAllowedIpMutation = useAddAllowedIpToProject();
  const { data: projectRaw, isLoading: isProjectLoading } =
    useGetProjectById(projectId);

  const { data: instancesData, isLoading: isInstanceLoading } =
    useGetInstancesByProjectId(projectId);

  if (isProjectLoading || isInstanceLoading) {
    return <div className="p-8 text-center">Loading project...</div>;
  }

  if (!projectRaw) {
    return (
      <div className="p-8 text-center text-red-500">
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

  const handleAddAllowedIp = async (ip: string) => {
    const normalizedIp = ip.trim();

    if (!normalizedIp) {
      toast.error("Please enter an IP address");
      return;
    }

    const toastId = toast.loading("Adding allowed IP...");

    try {
      await addAllowedIpMutation.mutateAsync({
        id: projectId,
        ip: normalizedIp,
      });
      toast.success("Allowed IP added", { id: toastId });
    } catch {
      toast.error("Failed to add allowed IP", { id: toastId });
      throw new Error("Failed to add allowed IP");
    }
  };

  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-6 md:p-8">
      {/* Header Section */}
      <ProjectHeader project={project} instances={instances} />

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
          <SystemInformation project={project} instances={instances} />
          <ProjectDomainsCard
            projectId={projectId}
            isAddingAllowedIp={addAllowedIpMutation.isPending}
            onAddAllowedIp={handleAddAllowedIp}
          />
          <ProjectTabs project={project} />
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
