"use client";

import { ProjectInstanceCard } from "@/components/project/project-instance-card";
import { useCreateInstance } from "@/hooks/use-instance";
import { useGetProjectById } from "@/hooks/use-project";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { toast } from "sonner";

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

export default function ClientView({ projectId }: { projectId: string }) {
  const { data, isLoading, isError } = useGetProjectById(projectId);
  const { mutateAsync: createInstance } = useCreateInstance();

  const handleCreate = async () => {
    const toastId = toast.loading("Creating the new instance");
    try {
      await createInstance({ projectId: projectId });
      toast.success("created", { id: toastId });
    } catch {
      toast.error("failed", { id: toastId });
    }
  };

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
  const projectInstances = Array.isArray(instances) ? instances : [];

  return (
    <div className="space-y-8 p-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <Button
            onClick={() => {
              void handleCreate();
            }}
          >
            Create Instance
          </Button>
        </div>
        <p className="text-muted-foreground mt-2">
          {project.description || "No description provided."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic details and metadata for this project.</CardDescription>
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
