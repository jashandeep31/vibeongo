"use client";

import { useGetInstances } from "@/hooks/use-instance";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";

export default function ClientView() {
  const { data: response, isLoading } = useGetInstances({
    state: "running",
    includeProject: true,
  });
  const instances = response?.data ?? [];

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-[50vh] items-center justify-center p-6">
        Loading instances...
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[50vh] items-center justify-center p-6">
        No running instances found.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Instances</h1>
        <p className="text-muted-foreground mt-2">
          Manage your currently running project instances.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {instances.map((instance) => (
          <ProjectInstanceCard
            key={instance.id}
            projectId={instance.project_id || ""}
            instance={instance}
          />
        ))}
      </div>
    </div>
  );
}
