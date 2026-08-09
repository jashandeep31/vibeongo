"use client";

import { useCreateGithubRepo } from "@/hooks/use-project";
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
import { createGithubRepoSchema } from "@repo/shared";
import axios from "axios";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

export function GithubRepoDialog({ children }: { children: ReactNode }) {
  const createRepo = useCreateGithubRepo();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [setupScript, setSetupScript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && createRepo.isPending) return;
    setOpen(nextOpen);
    setError(null);
    if (!nextOpen) {
      setUrl("");
      setSetupScript("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = createGithubRepoSchema.safeParse({
      url,
      setup_script: setupScript,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Check the repository.");
      return;
    }

    setError(null);
    try {
      await createRepo.mutateAsync(validation.data);
      toast.success("GitHub repository added");
      handleOpenChange(false);
    } catch (requestError) {
      const responseMessage = axios.isAxiosError<{ message?: unknown }>(
        requestError,
      )
        ? requestError.response?.data?.message
        : undefined;
      setError(
        typeof responseMessage === "string"
          ? responseMessage
          : "Could not add this repository. Check that the GitHub App has access.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add GitHub repository</DialogTitle>
            <DialogDescription>
              Connect a repository that your installed VibeOnGo GitHub App can
              access.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-2">
              <Label htmlFor="github-repository-url">Repository URL</Label>
              <Input
                id="github-repository-url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/owner/repository"
                autoFocus
                disabled={createRepo.isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="github-repository-setup-script">
                Setup script (optional)
              </Label>
              <Textarea
                id="github-repository-setup-script"
                value={setupScript}
                onChange={(event) => setSetupScript(event.target.value)}
                placeholder="npm install"
                className="min-h-24 font-mono text-xs"
                disabled={createRepo.isPending}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createRepo.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRepo.isPending}>
              {createRepo.isPending ? "Adding..." : "Add repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
