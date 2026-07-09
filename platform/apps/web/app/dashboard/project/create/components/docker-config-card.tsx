"use client";

import { Label } from "@repo/ui/components/label";
import { Package, Plus, Trash2 } from "lucide-react";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Button } from "@repo/ui/components/button";
import { memo, useCallback, useMemo } from "react";
import { useConfigStore } from "@/store/config-store";

interface ContainerConfig {
  id: string;
  name: string;
  dockercomposecode: string;
}

interface ContainerEditorProps {
  container: ContainerConfig;
  onUpdateContainer: (id: string, updates: Partial<ContainerConfig>) => void;
  onRemoveContainer: (id: string) => void;
}

const PREDEFINED_CONTAINERS = [
  {
    name: "PostgreSQL Database",
    dockercomposecode: `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:`,
  },
  {
    name: "Redis Cache",
    dockercomposecode: `version: '3.8'\nservices:\n  redis:\n    image: redis:7-alpine\n    ports:\n      - "6379:6379"\n    command: redis-server --save 20 1 --loglevel warning\n    volumes:\n      - redis_data:/data\n\nvolumes:\n  redis_data:`,
  },
];

const ContainerEditor = memo(function ContainerEditor({
  container,
  onUpdateContainer,
  onRemoveContainer,
}: ContainerEditorProps) {
  return (
    <div className="border-border bg-card space-y-3 rounded-md border p-4">
      <div className="flex items-center space-x-3">
        <Input
          value={container.name}
          onChange={(e) =>
            onUpdateContainer(container.id, {
              name: e.target.value,
            })
          }
          placeholder="Container Name"
          className="bg-transparent font-medium"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveContainer(container.id)}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={container.dockercomposecode}
        onChange={(e) =>
          onUpdateContainer(container.id, {
            dockercomposecode: e.target.value,
          })
        }
        placeholder="docker-compose.yml or Dockerfile code..."
        className="bg-muted/50 h-32 resize-y overflow-y-auto font-mono text-xs whitespace-pre"
      />
    </div>
  );
});

function DockerConfigCard() {
  const additionalServices = useConfigStore((s) => s.additionalServices);
  const updateDockerConfig = useConfigStore((s) => s.updateDockerConfig);
  const containers = useMemo(
    () => additionalServices.dockerConfig.containers || [],
    [additionalServices.dockerConfig.containers],
  );

  const addContainer = useCallback(
    (name: string, dockercomposecode: string = "") => {
      const newContainer = {
        id: crypto.randomUUID(),
        name,
        dockercomposecode,
      };
      updateDockerConfig({
        containers: [...containers, newContainer],
      });
    },
    [containers, updateDockerConfig],
  );

  const removeContainer = useCallback(
    (id: string) => {
      updateDockerConfig({
        containers: containers.filter((container) => container.id !== id),
      });
    },
    [containers, updateDockerConfig],
  );

  const updateContainer = useCallback(
    (id: string, updates: Partial<ContainerConfig>) => {
      updateDockerConfig({
        containers: containers.map((container) =>
          container.id === id ? { ...container, ...updates } : container,
        ),
      });
    },
    [containers, updateDockerConfig],
  );

  return (
    <div className="bg-card border-border rounded-lg border p-6">
      <div className="flex items-start space-x-3">
        <div className="w-full space-y-1">
          <Label
            htmlFor="docker-engine"
            className="text-foreground flex items-center text-base font-semibold"
          >
            <Package className="mr-2 h-5 w-5" />
            Docker Engine
          </Label>
          <p className="text-muted-foreground text-sm">
            Pre-install Docker and run popular containers.
          </p>

          <div className="w-full pt-6">
            <div className="border-border mb-6 border-t"></div>

            <div className="space-y-8">
              {containers.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-foreground text-sm font-semibold">
                    Active Containers
                  </h4>
                  {containers.map((container) => (
                    <ContainerEditor
                      key={container.id}
                      container={container}
                      onUpdateContainer={updateContainer}
                      onRemoveContainer={removeContainer}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-foreground text-sm font-semibold">
                  Add Container
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addContainer("Custom Container")}
                    className="border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Custom Container
                  </Button>
                  {PREDEFINED_CONTAINERS.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        addContainer(preset.name, preset.dockercomposecode)
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DockerConfigCard);
