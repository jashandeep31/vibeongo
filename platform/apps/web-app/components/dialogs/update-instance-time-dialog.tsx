"use client";

import { useUpdateInstanceTime } from "@repo/api-hooks";
import { MAX_BOAT_EXTENSION_MINUTES } from "@repo/shared/providers";
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
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

export function UpdateInstanceTimeDialog({
  instanceId,
  projectSessionId,
  isBoatSandbox = false,
  children,
}: {
  instanceId: string;
  projectSessionId: string;
  isBoatSandbox?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"increase" | "decrease">("increase");
  const [minutes, setMinutes] = useState("60");
  const actionId = useId();
  const minutesId = useId();
  const updateInstanceTime = useUpdateInstanceTime(projectSessionId);
  const submitting = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || updateInstanceTime.isPending) return;
    const timeInMinutes = Number(minutes);
    if (
      !Number.isSafeInteger(timeInMinutes) ||
      timeInMinutes < 1 ||
      (isBoatSandbox && timeInMinutes > MAX_BOAT_EXTENSION_MINUTES)
    ) {
      toast.error(
        isBoatSandbox
          ? `Enter 1–${MAX_BOAT_EXTENSION_MINUTES} whole minutes`
          : "Enter a whole number of minutes greater than zero",
      );
      return;
    }

    submitting.current = true;
    try {
      const instance = await updateInstanceTime.mutateAsync({
        id: instanceId,
        action: isBoatSandbox ? "increase" : action,
        timeInMinutes,
      });
      setOpen(false);
      toast.success("Runtime expiration updated", {
        description: `Expires ${new Date(instance.terminates_at).toLocaleString()}`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update runtime expiration",
      );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update expiration time</DialogTitle>
          <DialogDescription>
            {isBoatSandbox
              ? `Add 1–${MAX_BOAT_EXTENSION_MINUTES} whole minutes to this runtime's current expiration.`
              : "Add or remove time from this runtime's current expiration."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div
            className={
              isBoatSandbox
                ? "grid gap-4 py-4"
                : "grid gap-4 py-4 sm:grid-cols-2"
            }
          >
            {!isBoatSandbox ? (
              <div className="grid gap-2">
                <Label htmlFor={actionId}>Action</Label>
                <Select
                  value={action}
                  onValueChange={(value: "increase" | "decrease") =>
                    setAction(value)
                  }
                  disabled={updateInstanceTime.isPending}
                >
                  <SelectTrigger id={actionId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Add time</SelectItem>
                    <SelectItem value="decrease">Remove time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor={minutesId}>Minutes</Label>
              <Input
                id={minutesId}
                type="number"
                min={1}
                max={isBoatSandbox ? MAX_BOAT_EXTENSION_MINUTES : undefined}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                disabled={updateInstanceTime.isPending}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateInstanceTime.isPending}>
              {updateInstanceTime.isPending
                ? "Updating..."
                : "Update expiration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
