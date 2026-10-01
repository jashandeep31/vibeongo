"use client";

import { useGetProjectWithDetails } from "@repo/api-hooks";
import { useSessionsStore } from "@repo/app-store";
import { Button } from "@repo/ui/components/button";
import { instanceRuntimeKind } from "@repo/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Box, Cloud } from "lucide-react";
import {
  getRuntimeProviderName,
  RuntimeProviderIcon,
} from "@/components/runtime-provider-icon";

export type ProjectSessionRuntime =
  (typeof instanceRuntimeKind.enumValues)[number];

type ProjectSessionRuntimeDialogProps = {
  open: boolean;
  // Session being resumed, used to show the project's configured provider and size
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (runtime: ProjectSessionRuntime) => void;
};

type RuntimeTarget = {
  name: string;
  provider: string;
  cpu: number;
  ram: number;
  storage: number;
  region_name: string | null;
};

const runtimes = [
  {
    value: "vm" as const,
    title: "Virtual machine",
    description: "Launch the project on its configured cloud instance.",
    Icon: Cloud,
  },
  {
    value: "sandbox" as const,
    title: "Sandbox",
    description: "Launch the project in its configured isolated sandbox.",
    Icon: Box,
  },
];

// Sandbox type names can already contain the specs, e.g. "Custom 4 vCPU / 8 GiB"
const formatSpecs = ({ name, cpu, ram, storage }: RuntimeTarget) => {
  const specs = [
    `${cpu} vCPU`,
    `${ram} GB RAM`,
    `${storage} GB storage`,
  ].filter((spec) => !name.includes(spec));
  return specs.join(" · ");
};

export function ProjectSessionRuntimeDialog({
  open,
  sessionId,
  onOpenChange,
  onSelect,
}: ProjectSessionRuntimeDialogProps) {
  const projectId = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === sessionId)?.session
        .project_id ?? null,
  );
  const projectDetails = useGetProjectWithDetails(open ? projectId : null);
  const deployment = projectDetails.data?.deployment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a runtime</DialogTitle>
          <DialogDescription>
            Select where this session should run. The provider and size come
            from the project configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          {runtimes.map(({ value, title, description, Icon }) => {
            const target = deployment?.[value] ?? null;
            const specs = target ? formatSpecs(target) : "";

            return (
              <button
                key={value}
                type="button"
                onClick={() => onSelect(value)}
                className="hover:border-primary hover:bg-muted/50 flex min-h-32 flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors"
              >
                <span className="bg-muted rounded-md p-2">
                  {target ? (
                    <RuntimeProviderIcon provider={target.provider} />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </span>
                <span className="w-full min-w-0">
                  <span className="block font-medium">{title}</span>
                  {projectDetails.isLoading ? (
                    <span className="mt-2 grid gap-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </span>
                  ) : target ? (
                    <span className="mt-1 block text-sm">
                      <span className="block truncate font-mono">
                        {target.name}
                      </span>
                      <span className="text-muted-foreground block truncate">
                        {[
                          getRuntimeProviderName(target.provider),
                          target.region_name,
                          specs,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground mt-1 block text-sm">
                      {description}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
