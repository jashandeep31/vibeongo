"use client";

import { Server } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { useGetProjects } from "@/hooks/use-project";

export function ProjectList() {
  const { data: projects, isLoading, error } = useGetProjects();

  if (isLoading) {
    return <div className="text-muted-foreground">Loading projects...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error loading projects.</div>;
  }

  // Ensure projects is an array
  const projectsList = projects || [];

  const runningProjects = projectsList.filter((p) => p.status === "running");
  const stoppedProjects = projectsList.filter((p) => p.status !== "running");

  const ProjectCard = ({ project }: { project: any }) => (
    <Link href={`/dashboard/project/${project.id}`}>
      <Card className="hover:bg-muted/50 flex cursor-pointer flex-col transition-colors">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
              <Server className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
          {project.status === "running" ? (
            <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
              Running
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-muted-foreground border-0"
            >
              {project.status || "Stopped"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            {project.description || "No description provided."}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      {runningProjects.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Running Now</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {runningProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {stoppedProjects.length > 0 && (
        <div>
          <h2 className="text-muted-foreground mb-4 text-xl font-semibold">
            Offline / Stopped
          </h2>
          <div className="grid grid-cols-1 gap-6 opacity-75 grayscale-[20%] md:grid-cols-2 lg:grid-cols-3">
            {stoppedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {projectsList.length === 0 && (
        <div className="text-muted-foreground">
          No projects found. Create one to get started!
        </div>
      )}
    </div>
  );
}
