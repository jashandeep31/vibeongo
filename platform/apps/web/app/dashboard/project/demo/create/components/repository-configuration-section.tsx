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
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your GitHub repositories to automatically clone and push
          changes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="border-border bg-card relative rounded-lg border p-4 shadow-sm"
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted/50 hover:text-destructive absolute top-2 right-2 h-8 w-8"
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
                  <Github className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                  <Input
                    id={`github-url-${repo.id}`}
                    placeholder="https://github.com/user/repo"
                    value={repo.url}
                    onChange={(event) =>
                      onUpdateRepository(repo.id, "url", event.target.value)
                    }
                    className="bg-background h-9 pl-8"
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
                  className="bg-background h-9"
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
            className="border-border hover:border-primary/50 hover:bg-muted/50 h-9 w-full border-dashed bg-transparent transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
      </div>
    </div>
  );
}
