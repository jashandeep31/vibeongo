"use client";

import { useCreateProjectSession } from "@/hooks/use-project-sessions";
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
import axios from "axios";
import { useState, type FormEvent, type ReactNode } from "react";

type CreateProjectSessionDialogProps = {
  children?: ReactNode;
  projectId: string;
  projectName: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateProjectSessionDialog({
  children,
  projectId,
  projectName,
  open: controlledOpen,
  onOpenChange,
}: CreateProjectSessionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createSession = useCreateProjectSession();
  const open = controlledOpen ?? internalOpen;

  const setDialogOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const resetForm = () => {
    setSessionName("");
    setSessionDescription("");
    setErrorMessage(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && createSession.isPending) return;

    setDialogOpen(nextOpen);
    if (nextOpen) {
      setErrorMessage(null);
    } else {
      resetForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = sessionName.trim();
    if (!projectId || trimmedName.length < 4) return;

    setErrorMessage(null);
    try {
      await createSession.mutateAsync({
        projectId,
        sessionName: trimmedName,
        sessionDescription: sessionDescription.trim() || undefined,
      });
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      setErrorMessage(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not create the session.")
          : "Could not create the session.",
      );
    }
  };

  const isSubmitDisabled =
    createSession.isPending || sessionName.trim().length < 4;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project session</DialogTitle>
            <DialogDescription>
              Create a session for {projectName} without starting a VM or
              sandbox. You can resume it later when you are ready to work.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="new-session-name">Session name</Label>
              <Input
                id="new-session-name"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                placeholder="e.g. Implement command palette"
                minLength={4}
                autoFocus
                disabled={createSession.isPending}
              />
              {sessionName.length > 0 && sessionName.trim().length < 4 ? (
                <p className="text-destructive text-xs">
                  Session name must be at least 4 characters.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-session-description">
                Description (optional)
              </Label>
              <Textarea
                id="new-session-description"
                value={sessionDescription}
                onChange={(event) => setSessionDescription(event.target.value)}
                placeholder="What will this session be used for?"
                className="resize-none"
                disabled={createSession.isPending}
              />
            </div>

            {errorMessage ? (
              <p className="text-destructive text-sm">{errorMessage}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createSession.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {createSession.isPending ? "Creating..." : "Create session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
