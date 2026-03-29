import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Label } from "@repo/ui/components/label";
import { Trash2 } from "lucide-react";
import { z } from "@repo/shared";
import React, { useCallback } from "react";
import { createGitRepoConfig, type GitRepoConfig } from "../types";
import { useConfigStore } from "@/store/config-store";

const gitRepoSchema = z.object({
  git_url: z
    .string()
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+\.git$/, {
      message:
        "Must be a valid GitHub repository URL ending in .git (e.g., https://github.com/user/repo.git)",
    }),
  access_token: z.string().optional(),
  folder_name: z.string().min(1, "Folder name is required"),
  setup_script: z.string().optional(),
});

const RepoConfigItemCard = React.memo(function RepoConfigItemCard({
  repo,
  index,
  onUpdateRepo,
  onDeleteRepo,
}: {
  repo: GitRepoConfig;
  index: number;
  onUpdateRepo: (id: string, updates: Partial<GitRepoConfig>) => void;
  onDeleteRepo: (id: string) => void;
}) {
  const parsed = gitRepoSchema.safeParse(repo);
  const errors = !parsed.success ? parsed.error.flatten().fieldErrors : {};

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Repo {index + 1}</p>
          <Button
            variant={"ghost"}
            size={"icon"}
            className="text-muted-foreground h-8 w-8"
            onClick={() => onDeleteRepo(repo.id)}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Repo Url</Label>
          <Input
            value={repo.git_url}
            onChange={(e) => {
              const url = e.target.value;
              const updates: Partial<GitRepoConfig> = { git_url: url };

              // Extract folder name from valid Git URL if folder name is empty or matches previous extraction
              if (
                !repo.folder_name ||
                repo.folder_name ===
                  repo.git_url
                    .split("/")
                    .pop()
                    ?.replace(/\.git$/, "")
              ) {
                const match = url.match(/\/([^/]+)\.git$/);
                if (match && match[1]) {
                  updates.folder_name = match[1];
                } else if (url === "") {
                  updates.folder_name = "";
                }
              }

              onUpdateRepo(repo.id, updates);
            }}
            placeholder="https://github.com/username/repo.git"
            className={
              errors.git_url && repo.git_url.length > 0
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.git_url && repo.git_url.length > 0 && (
            <p className="text-destructive text-[0.8rem] font-medium">
              {errors.git_url[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">
            Personal Access Token{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (optional)
            </span>
          </Label>
          <Input
            type="password"
            value={repo.access_token}
            onChange={(e) =>
              onUpdateRepo(repo.id, { access_token: e.target.value })
            }
            placeholder="ghp_..."
            className={
              errors.access_token && repo.access_token.length > 0
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.access_token && repo.access_token.length > 0 && (
            <p className="text-destructive text-[0.8rem] font-medium">
              {errors.access_token[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Folder Name</Label>
          <Input
            value={repo.folder_name || ""}
            onChange={(e) =>
              onUpdateRepo(repo.id, { folder_name: e.target.value })
            }
            placeholder="my-project"
            className={
              errors.folder_name &&
              (!repo.folder_name || repo.folder_name.length === 0)
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.folder_name &&
            (!repo.folder_name || repo.folder_name.length === 0) && (
              <p className="text-destructive text-[0.8rem] font-medium">
                {errors.folder_name[0]}
              </p>
            )}
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">
            Setup Script{" "}
            <span className="text-muted-foreground text-xs font-normal">
              (optional)
            </span>
          </Label>
          <Textarea
            value={repo.setup_script || ""}
            onChange={(e) =>
              onUpdateRepo(repo.id, { setup_script: e.target.value })
            }
            placeholder="#!/usr/bin/env bash&#10;# Your setup commands here..."
            className={
              errors.setup_script
                ? "border-destructive focus-visible:ring-destructive font-mono text-xs"
                : "font-mono text-xs"
            }
          />
          {errors.setup_script && (
            <p className="text-destructive text-[0.8rem] font-medium">
              {errors.setup_script[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

const GitRepoConfigCard = React.memo(() => {
  const { gitRepos, setGitRepos, addGitRepo, removeGitRepo } = useConfigStore();
  const handleAddRepo = useCallback(() => {
    addGitRepo(createGitRepoConfig());
  }, [addGitRepo]);

  const handleDeleteRepo = useCallback(
    (id: string) => {
      removeGitRepo(id);
    },
    [removeGitRepo],
  );

  const handleUpdateRepo = useCallback(
    (id: string, updates: Partial<GitRepoConfig>) => {
      setGitRepos(
        gitRepos.map((repo) =>
          repo.id === id ? { ...repo, ...updates } : repo,
        ),
      );
    },
    [gitRepos, setGitRepos],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-sm">
          Github Repos Config
        </Label>
        <Button variant={"outline"} onClick={handleAddRepo} type="button">
          + Add Repo
        </Button>
      </div>
      {gitRepos.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          No git repos are configured.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {gitRepos.map((repo, index) => (
            <RepoConfigItemCard
              key={repo.id}
              index={index}
              repo={repo}
              onUpdateRepo={handleUpdateRepo}
              onDeleteRepo={handleDeleteRepo}
            />
          ))}
        </div>
      )}
    </div>
  );
});
GitRepoConfigCard.displayName = "GitRepoConfigCard";
export default GitRepoConfigCard;
