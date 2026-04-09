"use client";

import { useState } from "react";
import { useCreateInstance } from "@/hooks/use-instance";
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
import { Textarea } from "@repo/ui/components/textarea";
import { toast } from "sonner";
import { createInstanceSchema } from "@repo/shared";
import axios from "axios";

interface CreateInstanceDialogProps {
  projectId: string;
  projectName: string;
  onSuccess?: () => void;
}

export function CreateInstanceDialog({
  projectId,
  projectName,
  onSuccess,
}: CreateInstanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const { mutateAsync: createInstance, isPending } = useCreateInstance();

  const handleCreate = async () => {
    const parsedData = createInstanceSchema.safeParse({
      projectId,
      sessionName: sessionName.trim(),
      sessionDescription: sessionDescription.trim() || undefined,
    });

    if (!parsedData.success) {
      toast.error(parsedData.error.issues[0]?.message ?? "Invalid data");
      return;
    }

    const toastId = toast.loading("Creating new instance and session...");
    try {
      await createInstance(parsedData.data);
      toast.success("Instance created successfully", { id: toastId });
      setOpen(false);
      setSessionName("");
      setSessionDescription("");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? (error.response?.data?.message ?? "Failed to create instance")
        : "Failed to create instance";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Instance</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Instance</DialogTitle>
          <DialogDescription>
            This will start a new session. Provide a name and description to
            help you identify this session later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sessionName">Session Name</Label>
            <Input
              id="sessionName"
              placeholder={`e.g., ${projectName} Session`}
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              minLength={4}
            />
            {sessionName.length > 0 && sessionName.trim().length < 4 && (
              <span className="text-destructive text-xs">
                Must be at least 4 characters
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sessionDescription">Description (Optional)</Label>
            <Textarea
              id="sessionDescription"
              placeholder="What are you working on in this session?"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
