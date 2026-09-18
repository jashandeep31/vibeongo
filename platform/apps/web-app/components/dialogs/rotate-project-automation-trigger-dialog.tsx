"use client";

import { useRotateProjectAutomationTriggerToken } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import axios from "axios";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export function RotateProjectAutomationTriggerDialog({
  automationId,
  triggerId,
  triggerName,
  children,
}: {
  automationId: string;
  triggerId: string;
  triggerName: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const rotateToken = useRotateProjectAutomationTriggerToken();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setSecret(null);
  };

  const rotate = async () => {
    try {
      const response = await rotateToken.mutateAsync({
        automationId,
        triggerId,
      });
      setSecret(response.data.secret);
      toast.success("Integration token rotated");
    } catch (error) {
      const message = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        typeof message === "string"
          ? message
          : "Could not rotate the integration token.",
      );
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Bearer secret copied");
    } catch {
      toast.error("Could not copy the bearer secret");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rotate integration token</DialogTitle>
          <DialogDescription>
            Rotating <strong>{triggerName}</strong> immediately invalidates the
            current token. The new token is shown only once.
          </DialogDescription>
        </DialogHeader>

        {secret ? (
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">New bearer secret</p>
            <div className="flex gap-2">
              <Input value={secret} readOnly className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy bearer secret"
                onClick={() => void copySecret()}
              >
                <Copy />
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={rotateToken.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void rotate()}
              disabled={rotateToken.isPending}
            >
              {rotateToken.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {rotateToken.isPending ? "Rotating…" : "Rotate token"}
            </Button>
          </DialogFooter>
        )}

        {secret ? (
          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
