"use client";
import { ProjectHeader } from "./project-header";
import { SystemInformation } from "./system-information";
import { ProjectTabs } from "./project-tabs";
import { UsageBilling } from "./usage-billing";
import { useGetProjectById } from "@/hooks/use-project";

export function ProjectView({ projectId }: { projectId: string }) {
  const { data, isLoading } = useGetProjectById(projectId);

  if (isLoading) {
    return <div className="p-8 text-center">Loading project...</div>;
  }

  if (!data?.project) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load project.
      </div>
    );
  }

  const project = data.project;
  const instances = data.instances || [];

  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-6 md:p-8">
      {/* Header Section */}
      <ProjectHeader project={data.project} />

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
        {JSON.stringify(data.project.config, null, 2)}
      </pre>
    </div>
  );
}
