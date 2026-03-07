import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Github, Plus, Trash2 } from "lucide-react";

import type { Repository } from "./types";

type RepositoryConfigurationSectionProps = {
  repositories: Repository[];
  onAddRepository: () => void;
  onUpdateRepository: (
    id: number,
    field: "url" | "token",
    value: string,
  ) => void;
  onRemoveRepository: (id: number) => void;
};

export function RepositoryConfigurationSection({
  repositories,
  onAddRepository,
  onUpdateRepository,
  onRemoveRepository,
}: RepositoryConfigurationSectionProps) {
  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <Label className="text-base font-semibold">
          Repository Configuration
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your GitHub repositories to automatically clone and push
          changes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="relative rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:bg-muted/50 hover:text-destructive"
              onClick={() => onRemoveRepository(repo.id)}
              disabled={repositories.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="grid grid-cols-1 gap-4 pr-8">
              <div className="space-y-2">
                <Label
                  className="text-sm font-medium"
                  htmlFor={`github-url-${repo.id}`}
                >
                  GitHub Repository URL
                </Label>
                <div className="relative">
                  <Github className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`github-url-${repo.id}`}
                    placeholder="https://github.com/user/repo"
                    value={repo.url}
                    onChange={(event) =>
                      onUpdateRepository(repo.id, "url", event.target.value)
                    }
                    className="h-9 bg-background pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  className="text-sm font-medium"
                  htmlFor={`github-token-${repo.id}`}
                >
                  Personal Access Token
                </Label>
                <Input
                  id={`github-token-${repo.id}`}
                  type="password"
                  placeholder="ghp_..."
                  value={repo.token}
                  onChange={(event) =>
                    onUpdateRepository(repo.id, "token", event.target.value)
                  }
                  className="h-9 bg-background"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="col-span-1 flex justify-center md:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddRepository}
            className="h-9 w-full border-dashed border-border bg-transparent transition-all hover:border-primary/50 hover:bg-muted/50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </div>
    </div>
  );
}
