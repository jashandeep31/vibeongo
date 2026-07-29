import { Label } from "@repo/ui/components/label";
import React from "react";
import { useConfigStore } from "@/store/config-store";
import { useGetGithubRepos } from "@/hooks/use-github-repos";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CreateGithubRepoDialog } from "@/components/dialogs/create-github-repo-dialog";
import { Check, Github } from "lucide-react";

const GitRepoConfigCard = React.memo(() => {
  const { gitRepoIds, toggleGitRepoId } = useConfigStore();
  const { data: userRepos, isLoading: isLoadingRepos } = useGetGithubRepos();

  return (
    <div className="space-y-2">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">
            Select Github Repositories
          </Label>
          <CreateGithubRepoDialog />
        </div>

        {isLoadingRepos ? (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-9 w-52 rounded-lg" />
            ))}
          </div>
        ) : !userRepos || userRepos.length === 0 ? (
          <div className="text-muted-foreground py-2 text-sm">
            You do not have any connected GitHub repositories. Connect them in
            the dashboard.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {userRepos.map((repo) => {
              const isSelected = gitRepoIds.includes(repo.id);
              return (
                <Button
                  type="button"
                  variant="outline"
                  key={repo.id}
                  title={repo.full_name}
                  aria-pressed={isSelected}
                  onClick={() => toggleGitRepoId(repo.id)}
                  className={`h-9 max-w-full justify-start gap-2 px-3 ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                      : ""
                  }`}
                >
                  <Github className="size-4 shrink-0" />
                  <span className="max-w-64 truncate">{repo.full_name}</span>
                  {isSelected ? (
                    <Check className="ml-1 size-3.5 shrink-0" />
                  ) : null}
                </Button>
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
