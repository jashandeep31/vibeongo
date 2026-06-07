"use client";

import { useGetInstances } from "@/hooks/use-instance";
import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { Card, CardContent } from "@repo/ui/components/card";

export function RunningInstancesList() {
  const {
    data: response,
    isLoading,
    isError,
  } = useGetInstances({
    state: "running",
    includeProject: true,
  });

  const runningInstances = response?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Running Instances</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Currently active instances across your projects.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">
            Loading running instances...
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="text-destructive py-8 text-center">
            Failed to load running instances.
          </CardContent>
        </Card>
      ) : runningInstances.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center">
            No running instances found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {runningInstances.map((instance) => (
            <ProjectInstanceCard
              key={instance.id}
              projectId={instance.project_id || ""}
              instance={instance}
            />
          ))}
        </div>
      )}
    </div>
  );
}
