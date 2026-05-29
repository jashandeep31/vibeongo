"use client";

import { useEffect, useState } from "react";
import { Progress } from "@repo/ui/components/progress";
import { Cpu, HardDrive } from "lucide-react";

interface StatsData {
  total: number;
  used: number;
  free: number;
  used_percent: number;
  cpu_percent: number;
  time: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function ProjectInstanceStats() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const handleStats = (event: Event) => {
      const customEvent = event as CustomEvent<StatsData>;
      setStats(customEvent.detail);
    };

    window.addEventListener("vps-stats", handleStats);

    return () => {
      window.removeEventListener("vps-stats", handleStats);
    };
  }, []);

  const cpuPercent = stats ? stats.cpu_percent : null;
  const memoryPercent = stats ? stats.used_percent : null;
  const memoryUsage = stats
    ? `${formatBytes(stats.used)} / ${formatBytes(stats.total)}`
    : "Waiting";

  return (
    <div className="bg-muted/30 grid grid-cols-2 overflow-hidden rounded-lg border">
      <div className="min-w-0 border-r p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs font-medium">
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">CPU</span>
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {cpuPercent === null ? "--%" : `${cpuPercent.toFixed(0)}%`}
          </div>
        </div>
        <Progress value={cpuPercent ?? 0} className="mt-2 h-1.5" />
      </div>

      <div className="min-w-0 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs font-medium">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Memory</span>
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {memoryPercent === null ? "--%" : `${memoryPercent.toFixed(0)}%`}
          </div>
        </div>
        <div className="text-muted-foreground mt-1 truncate text-[11px]">
          {memoryUsage}
        </div>
        <Progress value={memoryPercent ?? 0} className="mt-1.5 h-1.5" />
      </div>
    </div>
  );
}
