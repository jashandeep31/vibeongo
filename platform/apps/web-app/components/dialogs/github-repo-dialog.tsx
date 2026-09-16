"use client";

import { useCreateForgejoRepo, useCreateGithubRepo } from "@repo/api-hooks";
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

type RepositoryProvider = "github" | "forgejo";

export function GithubRepoDialog({ children }: { children: ReactNode }) {
  const createGithubRepo = useCreateGithubRepo();
  const createForgejoRepo = useCreateForgejoRepo();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<RepositoryProvider>("github");
  const [url, setUrl] = useState("");
  const [setupScript, setSetupScript] = useState("");
  const [repoName, setRepoName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isPending = createGithubRepo.isPending || createForgejoRepo.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    setOpen(nextOpen);
    setError(null);
    if (!nextOpen) {
      setProvider("github");
      setUrl("");
      setSetupScript("");
      setRepoName("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (provider === "github") {
        const validation = createGithubRepoSchema.safeParse({
          url,
          setup_script: setupScript,
        });

        if (!validation.success) {
          setError(
            validation.error.issues[0]?.message ?? "Check the repository.",
          );
          return;
        }

        await createGithubRepo.mutateAsync(validation.data);
        toast.success("GitHub repository added");
      } else {
        const reponame = repoName.trim();
        if (!reponame) {
          setError("Repository name is required.");
          return;
        }

        await createForgejoRepo.mutateAsync({ reponame });
        toast.success("Forgejo repository created");
      }

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
          : provider === "github"
            ? "Could not add this repository. Check that the GitHub App has access."
            : "Could not create this Forgejo repository. Try a different name.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add repository</DialogTitle>
            <DialogDescription>
              Choose a provider to connect an existing GitHub repository or
              create a new private Forgejo repository.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div
              className="bg-muted/60 flex w-full border p-1 shadow-sm dark:border-white/10 dark:bg-white/5"
              aria-label="Repository provider"
              role="group"
            >
              <button
                type="button"
                aria-pressed={provider === "github"}
                onClick={() => {
                  setProvider("github");
                  setError(null);
                }}
                disabled={isPending}
                className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-9 flex-1 items-center justify-center rounded-md px-4 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 aria-pressed:shadow-sm"
              >
                GitHub
              </button>
              <button
                type="button"
                aria-pressed={provider === "forgejo"}
                onClick={() => {
                  setProvider("forgejo");
                  setError(null);
                }}
                disabled={isPending}
                className="text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground flex h-9 flex-1 items-center justify-center rounded-md px-4 text-sm transition-colors disabled:pointer-events-none disabled:opacity-50 aria-pressed:shadow-sm"
              >
                Forgejo
              </button>
            </div>

            {provider === "github" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="github-repository-url">Repository URL</Label>
                  <Input
                    id="github-repository-url"
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://github.com/owner/repository"
                    autoFocus
                    disabled={isPending}
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
                    disabled={isPending}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="forgejo-repository-name">Repository name</Label>
                <Input
                  id="forgejo-repository-name"
                  value={repoName}
                  onChange={(event) => setRepoName(event.target.value)}
                  placeholder="my-new-repository"
                  autoFocus
                  disabled={isPending}
                />
              </div>
            )}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? provider === "github"
                  ? "Adding..."
                  : "Creating..."
                : provider === "github"
                  ? "Add repository"
                  : "Create repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
