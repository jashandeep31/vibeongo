"use client";

import { useGetProjectById } from "@/hooks/use-project";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

export default function ClientView({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGetProjectById(projectId);

  if (isLoading) {
    return <div className="text-muted-foreground p-8">Loading project...</div>;
  }

  if (isError || !data?.project) {
    return (
      <div className="p-8">
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4">
          Failed to load project details.
        </div>
      </div>
    );
  }

  const { project, instances } = data;
  const projectInstances = instances ?? [];

  return (
    <div className="space-y-8 p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Button>Create Instance </Button>
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
              <p className="text-muted-foreground">Project ID</p>
              <p className="font-medium break-all">{project.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-medium break-all">{project.user_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Instance Type ID</p>
              <p className="font-medium break-all">
                {project.instance_type_id}
              </p>
            </div>
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

          <div className="mt-6">
            <p className="text-muted-foreground mb-2 text-sm">Config</p>
            {/* <pre className="bg-muted max-h-80 overflow-auto rounded-md border p-3 text-xs"> */}
            {/* {JSON.stringify(project.config, null, 2)} */}
            {/* </pre> */}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Instances</h2>

        {projectInstances.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center">
              No instances found for this project.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projectInstances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      Instance {instance.instance_id}
                    </CardTitle>
                    <Badge
                      variant={
                        instance.state === "running" ? "default" : "secondary"
                      }
                      className={
                        instance.state === "running"
                          ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                          : "text-muted-foreground border-0"
                      }
                    >
                      {instance.state}
                    </Badge>
                  </div>
                  <CardDescription className="break-all">
                    Instance Record ID: {instance.id}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Project ID</p>
                      <p className="font-medium break-all">
                        {formatValue(instance.project_id)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Instance Type</p>
                      <p className="font-medium break-all">
                        {formatValue(instance.instance_type)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Public IP</p>
                      <p className="font-medium">
                        {formatValue(instance.public_ip)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Private IP</p>
                      <p className="font-medium">
                        {formatValue(instance.private_ip)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Started At</p>
                      <p className="font-medium">
                        {formatDate(instance.started_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Terminated At</p>
                      <p className="font-medium">
                        {formatDate(instance.terminated_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created At</p>
                      <p className="font-medium">
                        {formatDate(instance.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Updated At</p>
                      <p className="font-medium">
                        {formatDate(instance.updated_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
