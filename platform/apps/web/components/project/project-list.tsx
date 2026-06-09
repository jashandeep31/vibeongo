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
import { useGetProjects } from "@/hooks/use-project";
import { projects as IProject } from "@repo/db";

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

  const ProjectCard = ({
    project,
  }: {
    project: typeof IProject.$inferSelect;
  }) => (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:bg-muted/50 flex cursor-pointer flex-col transition-colors">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
              <Server className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            {/* {project.description || "No description provided."} */}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      {projectsList.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">My Projects</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectsList.map((project) => (
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
