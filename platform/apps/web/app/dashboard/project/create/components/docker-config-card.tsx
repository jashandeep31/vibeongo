"use client";

import { Checkbox } from "@repo/ui/components/checkbox";
import { Label } from "@repo/ui/components/label";
import { Package, Plus, Trash2 } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";

interface DockerConfigCardProps {
  dockerEnabled: boolean;
  onDockerEnabledChange: (enabled: boolean) => void;
  // Ignoring these props internally but keeping them so parent components don't error
  selectedContainers: string[];
  onSelectedContainersChange: (containers: string[]) => void;
}

interface ContainerConfig {
  id: string;
  name: string;
  content: string;
}

const PREDEFINED_CONTAINERS = [
  {
    name: "PostgreSQL Database",
    content: `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:`,
  },
  {
    name: "Redis Cache",
    content: `version: '3.8'\nservices:\n  redis:\n    image: redis:7-alpine\n    ports:\n      - "6379:6379"\n    command: redis-server --save 20 1 --loglevel warning\n    volumes:\n      - redis_data:/data\n\nvolumes:\n  redis_data:`,
  },
];

export default function DockerConfigCard({
  dockerEnabled,
  onDockerEnabledChange,
}: DockerConfigCardProps) {
  const [containers, setContainers] = useState<ContainerConfig[]>([]);

  const addContainer = (name: string, content: string = "") => {
    const newContainer = {
      id: crypto.randomUUID(),
      name,
      content,
    };
    setContainers([...containers, newContainer]);
  };

  const removeContainer = (id: string) => {
    setContainers(containers.filter((c) => c.id !== id));
  };

  const updateContainer = (id: string, updates: Partial<ContainerConfig>) => {
    setContainers(
      containers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  return (
    <div
      className={`border rounded-lg p-6 transition-colors ${
        dockerEnabled
          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={dockerEnabled}
          onCheckedChange={(checked) => onDockerEnabledChange(checked === true)}
          className="mt-1"
          id="docker-engine-checkbox"
        />
        <div className="space-y-1 w-full">
          <Label
            htmlFor="docker-engine-checkbox"
            className="text-base font-semibold flex items-center cursor-pointer text-foreground"
          >
            <Package className="w-5 h-5 mr-2" />
            Docker Engine
          </Label>
          <p className="text-sm text-muted-foreground">
            Pre-install Docker and run popular containers.
          </p>

          {dockerEnabled && (
            <div className="pt-6 w-full animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="border-t border-border mb-6"></div>

              <div className="space-y-8">
                {/* Active Containers List */}
                {containers.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground">
                      Active Containers
                    </h4>
                    {containers.map((container) => (
                      <div
                        key={container.id}
                        className="border border-border rounded-md bg-card p-4 space-y-3"
                      >
                        <div className="flex items-center space-x-3">
                          <Input
                            value={container.name}
                            onChange={(e) =>
                              updateContainer(container.id, {
                                name: e.target.value,
                              })
                            }
                            placeholder="Container Name"
                            className="font-medium bg-transparent"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeContainer(container.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={container.content}
                          onChange={(e) =>
                            updateContainer(container.id, {
                              content: e.target.value,
                            })
                          }
                          placeholder="docker-compose.yml or Dockerfile content..."
                          className="font-mono text-xs whitespace-pre bg-muted/50 h-32 overflow-y-auto resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Buttons */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Add Container
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => addContainer("Custom Container")}
                      className="border-dashed"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Custom Container
                    </Button>
                    {PREDEFINED_CONTAINERS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="secondary"
                        onClick={() =>
                          addContainer(preset.name, preset.content)
                        }
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
