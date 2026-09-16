"use client";

import { useState, type ReactNode } from "react";
import { useUpdateInstanceTime } from "@/hooks/use-instance";
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
import { toast } from "sonner";

interface UpdateInstanceTimeDialogProps {
  instanceId: string;
  children: ReactNode;
}

export function UpdateInstanceTimeDialog({
  instanceId,
  children,
}: UpdateInstanceTimeDialogProps) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"increase" | "decrease">("increase");
  const [minutes, setMinutes] = useState("60");
  const { mutateAsync: updateInstanceTime, isPending } =
    useUpdateInstanceTime();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const timeInMinutes = Number(minutes);

    if (!Number.isInteger(timeInMinutes) || timeInMinutes < 1) {
      toast.error("Enter a whole number of minutes greater than zero");
      return;
    }

    const toastId = toast.loading("Updating instance expiration...");

    try {
      await updateInstanceTime({ id: instanceId, action, timeInMinutes });
      setOpen(false);
      toast.success("Instance expiration updated", { id: toastId });
    } catch {
      toast.error("Failed to update instance expiration", { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update expiration time</DialogTitle>
          <DialogDescription>
            Add or remove time from this instance&apos;s current expiration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="expiration-action">Action</Label>
              <Select
                value={action}
                onValueChange={(value: "increase" | "decrease") =>
                  setAction(value)
                }
                disabled={isPending}
              >
                <SelectTrigger id="expiration-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Add time</SelectItem>
                  <SelectItem value="decrease">Remove time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiration-minutes">Minutes</Label>
              <Input
                id="expiration-minutes"
                type="number"
                min={1}
                step={1}
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update expiration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
