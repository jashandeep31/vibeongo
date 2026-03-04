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
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {status === "running" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-0">
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
          <Server className="w-4 h-4" /> ID: {project.id}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
        {status === "running" ? (
          <>
            <Button variant="outline" size="lg">
              <Terminal className="w-4 h-4 mr-2" />
              SSH
            </Button>
            <Button variant="outline" size="lg">
              <Globe className="w-4 h-4 mr-2" />
              Opencode Web
            </Button>
            <Button variant="outline" size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setStatus("stopped")}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        ) : (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
            onClick={() => setStatus("running")}
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
