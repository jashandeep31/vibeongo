import { Server, PlusCircle } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";

type ProjectStatus = "running" | "stopped";

interface MockProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
}

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "proj-1",
    name: "Production Web",
    description: "Main application project handling incoming web traffic.",
    status: "running",
  },
  {
    id: "proj-2",
    name: "Database Primary",
    description: "Primary PostgreSQL database project with automated backups.",
    status: "running",
  },
  {
    id: "proj-3",
    name: "Redis Cache",
    description: "In-memory data store for faster query caching and sessions.",
    status: "stopped",
  },
  {
    id: "proj-4",
    name: "Background Worker",
    description: "Dedicated node for processing background jobs and queues.",
    status: "stopped",
  },
];

export default function ProjectsPage() {
  const runningProjects = MOCK_PROJECTS.filter((p) => p.status === "running");
  const stoppedProjects = MOCK_PROJECTS.filter((p) => p.status === "stopped");

  const ProjectCard = ({ project }: { project: MockProject }) => (
    <Card className="hover:bg-muted/50 transition-colors cursor-pointer flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <CardTitle className="text-lg">{project.name}</CardTitle>
        </div>
        {project.status === "running" ? (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-0">
            Running
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground border-0">
            Stopped
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">
          {project.description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-8 p-6 md:p-8 mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and monitor your active projects.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/project/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Running Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {runningProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
            Offline / Stopped
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale-[20%]">
            {stoppedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
