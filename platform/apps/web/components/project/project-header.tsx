"use client";

import { Globe, Play, RefreshCw, Server, Square, Terminal } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button, buttonVariants } from "@repo/ui/components/button";
import { Project, DbInstance } from "./types";
import Link from "next/link";

interface ProjectHeaderProps {
  project: Project;
  instances?: DbInstance[];
}

export function ProjectHeader({ project, instances = [] }: ProjectHeaderProps) {
  const isRunning = instances.some((instance) => instance.state === "running");

  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {isRunning ? (
            <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
              Running
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-muted-foreground border-0"
            >
              Terminated
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
        {isRunning ? (
          <>
            <Button variant="outline" size="lg">
              <Terminal className="mr-2 h-4 w-4" />
              SSH
            </Button>
            <Button variant="outline" size="lg">
              <Globe className="mr-2 h-4 w-4" />
              Opencode Web
            </Button>
            <Button variant="outline" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart
            </Button>
            <Button variant="destructive" size="lg">
              <Square className="mr-2 h-4 w-4" />
              Terminate
            </Button>
          </>
        ) : (
          <>
            <Link
              href={`/dashboard/project/${project.id}/manage/env`}
              className={buttonVariants()}
            >
              Manage ENV&apos;s
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
