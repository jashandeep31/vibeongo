"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
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

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--%</div>
            <Progress value={0} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--%</div>
            <div className="text-muted-foreground mt-1 text-xs">Waiting for data...</div>
            <Progress value={0} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          <Cpu className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cpu_percent.toFixed(2)}%</div>
          <Progress value={stats.cpu_percent} className="mt-3 h-2" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <HardDrive className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.used_percent.toFixed(2)}%</div>
          <div className="text-muted-foreground mt-1 text-xs">
            {formatBytes(stats.used)} / {formatBytes(stats.total)}
          </div>
          <Progress value={stats.used_percent} className="mt-2 h-2" />
        </CardContent>
      </Card>
    </div>
  );
}
