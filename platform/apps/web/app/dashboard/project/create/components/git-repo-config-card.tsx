import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import React, { useCallback } from "react";
import { useConfigStore } from "@/store/config-store";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";

const GitRepoConfigCard = React.memo(() => {
  const { gitRepos, addGitRepo, removeGitRepo } = useConfigStore();
  const { data: userRepos, isLoading: isLoadingRepos } = useGetGithubRepos();

  const handleAddRepo = useCallback(
    (fullName: string) => {
      // Check if already added
      const gitUrl = `https://github.com/${fullName}.git`;
      if (gitRepos.some((repo) => repo.git_url === gitUrl)) {
        return;
      }

      const folderName = fullName.split("/").pop() || "";

      addGitRepo({
        id: crypto.randomUUID(),
        git_url: gitUrl,
        access_token: "",
        folder_name: folderName,
        setup_script: `#!/usr/bin/env bash`,
      });
    },
    [addGitRepo, gitRepos],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">
            Select Github Repositories
          </Label>
          <CreateGithubRepoDialog />
        </div>

        {isLoadingRepos ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[46px] w-full rounded-lg" />
            ))}
          </div>
        ) : !userRepos || userRepos.length === 0 ? (
          <div className="text-muted-foreground bg-muted/50 rounded-lg border p-4 text-sm">
            You don't have any connected GitHub repositories. Connect them in
            the dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {userRepos.map((repo) => {
              const gitUrl = `https://github.com/${repo.full_name}.git`;
              const isSelected = gitRepos.some((r) => r.git_url === gitUrl);
              return (
                <button
                  type="button"
                  key={repo.id}
                  onClick={() => {
                    if (isSelected) {
                      const repoConfig = gitRepos.find(
                        (r) => r.git_url === gitUrl,
                      );
                      if (repoConfig) removeGitRepo(repoConfig.id);
                    } else {
                      handleAddRepo(repo.full_name);
                    }
                  }}
                  className={`hover:bg-muted/50 flex items-center space-x-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-primary ring-1"
                      : "bg-card border-border"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      if (isSelected) {
                        const repoConfig = gitRepos.find(
                          (r) => r.git_url === gitUrl,
                        );
                        if (repoConfig) removeGitRepo(repoConfig.id);
                      } else {
                        handleAddRepo(repo.full_name);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${repo.full_name}`}
                  />
                  <div
                    className={`truncate text-sm font-medium ${
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {repo.full_name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

GitRepoConfigCard.displayName = "GitRepoConfigCard";
export default GitRepoConfigCard;
