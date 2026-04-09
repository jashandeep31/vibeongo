"use client";

import { ProjectSessionWithRunningInstance } from "@/services/project-session-services";
import { Badge } from "@repo/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Clock3 } from "lucide-react";

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

type ProjectSessionsTableProps = {
  sessions: ProjectSessionWithRunningInstance[];
  isLoading: boolean;
  isError: boolean;
};

export function ProjectSessionsTable({
  sessions,
  isLoading,
  isError,
}: ProjectSessionsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border p-4">
        {[1, 2, 3, 4].map((row) => (
          <Skeleton key={row} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive rounded-lg border p-6">
        Failed to load sessions.
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center">
        <Clock3 className="mx-auto mb-4 h-10 w-10 opacity-50" />
        <h3 className="text-foreground text-lg font-medium">
          No sessions found
        </h3>
        <p className="mt-1 text-sm">
          Start a project session to see it listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session ID</TableHead>
              <TableHead>Project ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Running Instance</TableHead>
              <TableHead>Public IP</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead>Updated At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map(({ session, runningInstance }) => (
              <TableRow key={`${session.id}-${runningInstance?.id ?? "none"}`}>
                <TableCell
                  className="max-w-[220px] truncate font-mono text-xs"
                  title={session.id}
                >
                  {session.id}
                </TableCell>
                <TableCell
                  className="max-w-[220px] truncate font-mono text-xs"
                  title={session.project_id}
                >
                  {session.project_id}
                </TableCell>
                <TableCell>
                  {runningInstance ? (
                    <Badge className="border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 dark:text-emerald-400">
                      Running
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="border-0">
                      Idle
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className="max-w-[220px] truncate font-mono text-xs"
                  title={runningInstance?.id ?? "-"}
                >
                  {runningInstance?.id ?? "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {runningInstance?.public_ip ?? "-"}
                </TableCell>
                <TableCell>{formatDate(session.started_at)}</TableCell>
                <TableCell>{formatDate(session.updated_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
