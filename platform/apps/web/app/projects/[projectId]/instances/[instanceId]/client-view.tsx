"use client";
import { Loader2, Trash2 } from "lucide-react";

import { ProjectInstanceTerminal } from "@/components/project/project-instance-terminal";
import { ProjectInstanceInfoCard } from "@/components/project/project-instance-info-card";
import { useGetInstanceById, useTerminateInstance } from "@/hooks/use-instance";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { toast } from "sonner";

export default function ClientView({ instanceId }: { instanceId: string }) {
  const { data: instance } = useGetInstanceById(instanceId);
  const { mutateAsync: terminateInstance, isPending } = useTerminateInstance(
    instance?.project_id || "",
  );
  const isTerminated =
    instance?.state === "terminated" || !!instance?.terminated_at;

  const handleTerminate = async () => {
    if (!instance || isTerminated) {
      return;
    }

    const toastId = toast.loading("Terminating instance...");
    try {
      await terminateInstance(instance.id);
      toast.success("Instance terminated", { id: toastId });
    } catch {
      toast.error("Failed to terminate instance", { id: toastId });
    }
  };

  if (!instance) return <Card>Instance not found</Card>;

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Instance Terminal
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Live shell session and runtime information for this instance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="lg"
            variant="destructive"
            type="button"
            disabled={isPending || isTerminated}
            onClick={() => {
              void handleTerminate();
            }}
          >
            <Trash2 className="h-3 w-3" />
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Terminating...
              </>
            ) : isTerminated ? (
              "Terminated"
            ) : (
              "Terminate"
            )}
          </Button>
        </div>
      </div>

      <ProjectInstanceInfoCard instance={instance} />
      <ProjectInstanceTerminal publicIp={instance.public_ip} />
    </div>
  );
}
