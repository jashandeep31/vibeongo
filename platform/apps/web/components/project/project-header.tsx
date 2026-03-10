"use client";

import { Globe, Play, RefreshCw, Server, Square, Terminal } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Project } from "./types";

interface ProjectHeaderProps {
  project: Project;
  status: "running" | "stopped";
  setStatus: (status: "running" | "stopped") => void;
}

export function ProjectHeader({
  project,
  status,
  setStatus,
}: ProjectHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {status === "running" ? (
            <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
              Running
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-muted-foreground border-0"
            >
              Stopped
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground flex items-center gap-2">
          <Server className="h-4 w-4" /> ID: {project.id}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-0">
        {status === "running" ? (
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
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setStatus("stopped")}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </>
        ) : (
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            size="lg"
            onClick={() => setStatus("running")}
          >
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
