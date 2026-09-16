"use client";

import { useUpdateInstanceTime } from "@repo/api-hooks";
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
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

export function UpdateInstanceTimeDialog({
  instanceId,
  projectSessionId,
  children,
}: {
  instanceId: string;
  projectSessionId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"increase" | "decrease">("increase");
  const [minutes, setMinutes] = useState("60");
  const actionId = useId();
  const minutesId = useId();
  const updateInstanceTime = useUpdateInstanceTime(projectSessionId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const timeInMinutes = Number(minutes);
    if (!Number.isInteger(timeInMinutes) || timeInMinutes < 1) {
      toast.error("Enter a whole number of minutes greater than zero");
      return;
    }

    try {
      await updateInstanceTime.mutateAsync({
        id: instanceId,
        action,
        timeInMinutes,
      });
      setOpen(false);
      toast.success("Runtime expiration updated");
    } catch {
      toast.error("Could not update runtime expiration");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update expiration time</DialogTitle>
          <DialogDescription>
            Add or remove time from this runtime&apos;s current expiration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
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
            <div className="grid gap-2">
              <Label htmlFor={minutesId}>Minutes</Label>
              <Input
                id={minutesId}
                type="number"
                min={1}
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
