import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Trash2 } from "lucide-react";
import { z } from "@repo/shared";
import React, { useCallback } from "react";
import { createGitRepoConfig, type GitRepoConfig } from "../types";

const gitRepoSchema = z.object({
  git_url: z
    .string()
    .regex(/^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+\.git$/, {
      message:
        "Must be a valid GitHub repository URL ending in .git (e.g., https://github.com/user/repo.git)",
    }),
  access_token: z.string().optional(),
});

const RepoConfigItemCard = React.memo(function RepoConfigItemCard({
  repo,
  index,
  onUpdateRepo,
  onDeleteRepo,
}: {
  repo: GitRepoConfig;
  index: number;
  onUpdateRepo: (
    id: string,
    field: "git_url" | "access_token",
    value: string,
  ) => void;
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
          <Label className="text-sm text-muted-foreground">Repo Url</Label>
          <Input
            value={repo.git_url}
            onChange={(e) => onUpdateRepo(repo.id, "git_url", e.target.value)}
            placeholder="https://github.com/username/repo.git"
            className={
              errors.git_url && repo.git_url.length > 0
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.git_url && repo.git_url.length > 0 && (
            <p className="text-[0.8rem] font-medium text-destructive">
              {errors.git_url[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Personal Access Token{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <Input
            type="password"
            value={repo.access_token}
            onChange={(e) =>
              onUpdateRepo(repo.id, "access_token", e.target.value)
            }
            placeholder="ghp_..."
            className={
              errors.access_token && repo.access_token.length > 0
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {errors.access_token && repo.access_token.length > 0 && (
            <p className="text-[0.8rem] font-medium text-destructive">
              {errors.access_token[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

const GitRepoConfigCard = React.memo(
  ({
    gitRepos,
    setGitRepos,
  }: {
    gitRepos: GitRepoConfig[];
    setGitRepos: React.Dispatch<React.SetStateAction<GitRepoConfig[]>>;
  }) => {
    const handleAddRepo = useCallback(() => {
      setGitRepos((currentRepos) => [...currentRepos, createGitRepoConfig()]);
    }, [setGitRepos]);

    const handleDeleteRepo = useCallback(
      (idToRemove: string) => {
        setGitRepos((currentRepos) =>
          currentRepos.filter((repo) => repo.id !== idToRemove),
        );
      },
      [setGitRepos],
    );

    const handleUpdateRepo = useCallback(
      (
        idToUpdate: string,
        field: "git_url" | "access_token",
        value: string,
      ) => {
        setGitRepos((currentRepos) =>
          currentRepos.map((repo) =>
            repo.id === idToUpdate ? { ...repo, [field]: value } : repo,
          ),
        );
      },
      [setGitRepos],
    );

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            Github Repos Config
          </Label>
          <Button variant={"outline"} onClick={handleAddRepo} type="button">
            + Add Repo
          </Button>
        </div>
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
      </div>
    );
  },
);
GitRepoConfigCard.displayName = "GitRepoConfigCard";
export default GitRepoConfigCard;
