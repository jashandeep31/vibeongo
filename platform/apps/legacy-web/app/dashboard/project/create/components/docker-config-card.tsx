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
    <div className="border-border bg-card max-w-full min-w-0 space-y-2 overflow-hidden rounded-md border p-3">
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={container.name}
          onChange={(e) =>
            onUpdateContainer(container.id, {
              name: e.target.value,
            })
          }
          placeholder="Container Name"
          className="h-8 max-w-full min-w-0 bg-transparent font-medium"
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
        wrap="off"
        className="bg-muted/50 h-24 max-w-full min-w-0 resize-y overflow-auto font-mono text-xs whitespace-pre"
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
    <div className="bg-card border-border max-w-full min-w-0 overflow-hidden rounded-lg border p-3">
      <div className="max-w-full min-w-0 space-y-3">
        <Label
          htmlFor="docker-engine"
          className="text-foreground flex items-center text-sm font-medium"
        >
          <Package className="mr-2 size-4" />
          Docker
        </Label>

        {containers.length > 0 ? (
          <div className="max-w-full min-w-0 space-y-2">
            {containers.map((container) => (
              <ContainerEditor
                key={container.id}
                container={container}
                onUpdateContainer={updateContainer}
                onRemoveContainer={removeContainer}
              />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addContainer("Custom Container")}
            className="border-dashed"
          >
            <Plus />
            Custom
          </Button>
          {PREDEFINED_CONTAINERS.map((preset) => (
            <Button
              key={preset.name}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                addContainer(preset.name, preset.dockercomposecode)
              }
            >
              <Plus />
              {preset.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(DockerConfigCard);
