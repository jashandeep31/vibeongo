"use client";
import { ProjectHeader } from "./project-header";
import { SystemInformation } from "./system-information";
import { ProjectTabs } from "./project-tabs";
import { UsageBilling } from "./usage-billing";
import { useGetProjectById } from "@/hooks/use-project";
import { useGetInstancesByProjectId } from "@/hooks/use-instance";

import { Project } from "./types";

export function ProjectView({ projectId }: { projectId: string }) {
  const { data: projectRaw, isLoading: isProjectLoading } = useGetProjectById(projectId);

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

  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-6 md:p-8">
      {/* Header Section */}
      <ProjectHeader project={project} instances={instances} />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left Side: Configuration (75%) */}
        <div className="space-y-6 lg:w-3/4">
          <SystemInformation project={project} instances={instances} />
          <ProjectTabs project={project} />
        </div>

        {/* Right Side: Usage & Billing (25%) */}
        <div className="space-y-6 lg:w-1/4">
          <UsageBilling project={project} instances={instances} />
        </div>
      </div>
      <pre className="text-xs">
        {JSON.stringify(project.config, null, 2)}
      </pre>
    </div>
  );
}
