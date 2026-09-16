"use client";

import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { projectConfigValidator, type z } from "@repo/shared";
import {
  Bot,
  CircleDot,
  Eye,
  EyeOff,
  Package,
  Plus,
  ShieldCheck,
  ShieldX,
  Terminal,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export type ProjectPackages = z.infer<
  typeof projectConfigValidator
>["config"]["packages"];
type AuthJson = Extract<
  ProjectPackages[number],
  { name: "codex" }
>["config"]["auth_json"];

type DockerContainer = {
  id: string;
  name: string;
  dockercomposecode: string;
};

type AuthConfig = {
  authJson: string;
  useUserConfig: boolean;
};

export type ProjectServicesConfigValue = {
  dockerContainers: DockerContainer[];
  opencode: AuthConfig & {
    model: string;
  };
  codex: AuthConfig;
  pi: AuthConfig;
  fx: AuthConfig;
};

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

export function createDefaultProjectServicesConfig(): ProjectServicesConfigValue {
  return {
    dockerContainers: [],
    opencode: {
      authJson: "",
      useUserConfig: true,
      model: "",
    },
    codex: { authJson: "", useUserConfig: true },
    pi: { authJson: "", useUserConfig: true },
    fx: { authJson: "", useUserConfig: true },
  };
}

function formatAuthJson(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return "";
  }

  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

export function hydrateProjectServicesConfig(
  packages: ProjectPackages,
): ProjectServicesConfigValue {
  const docker = packages.find((item) => item.name === "docker");
  const opencode = packages.find((item) => item.name === "opencode");
  const codex = packages.find((item) => item.name === "codex");
  const pi = packages.find((item) => item.name === "pi");
  const fx = packages.find((item) => item.name === "fx");

  return {
    dockerContainers:
      docker?.config.containers.map((container) => ({
        ...container,
        id: crypto.randomUUID(),
      })) ?? [],
    opencode: {
      authJson: formatAuthJson(opencode?.config.auth_json),
      useUserConfig: opencode?.config.use_user_config ?? true,
      model: opencode?.config.model ?? "",
    },
    codex: {
      authJson: formatAuthJson(codex?.config.auth_json),
      useUserConfig: codex?.config.use_user_config ?? true,
    },
    pi: {
      authJson: formatAuthJson(pi?.config.auth_json),
      useUserConfig: pi?.config.use_user_config ?? true,
    },
    fx: {
      authJson: formatAuthJson(fx?.config.auth_json),
      useUserConfig: fx?.config.use_user_config ?? true,
    },
  };
}

function parseAuthJson(value: string, serviceName: string): AuthJson {
  if (!value.trim()) return {};

  try {
    return JSON.parse(value) as AuthJson;
  } catch {
    throw new Error(`Invalid ${serviceName} auth JSON`);
  }
}

export function buildProjectPackages(
  value: ProjectServicesConfigValue,
): ProjectPackages {
  return [
    {
      name: "docker",
      config: {
        containers: value.dockerContainers.map(
          ({ name, dockercomposecode }) => ({ name, dockercomposecode }),
        ),
      },
    },
    {
      name: "opencode",
      config: {
        auth_json: value.opencode.useUserConfig
          ? {}
          : parseAuthJson(value.opencode.authJson, "OpenCode"),
        use_user_config: value.opencode.useUserConfig,
        model: value.opencode.model,
      },
    },
    {
      name: "codex",
      config: {
        auth_json: value.codex.useUserConfig
          ? {}
          : parseAuthJson(value.codex.authJson, "Codex"),
        use_user_config: value.codex.useUserConfig,
      },
    },
    {
      name: "pi",
      config: {
        auth_json: value.pi.useUserConfig
          ? {}
          : parseAuthJson(value.pi.authJson, "Pi"),
        use_user_config: value.pi.useUserConfig,
      },
    },
    {
      name: "fx",
      config: {
        auth_json: value.fx.useUserConfig
          ? {}
          : parseAuthJson(value.fx.authJson, "FX"),
        use_user_config: value.fx.useUserConfig,
      },
    },
  ];
}

function SensitiveAuthJsonField({
  id,
  serviceName,
  value,
  disabled,
  onChange,
}: {
  id: string;
  serviceName: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  let hasValue = false;

  if (value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      hasValue = !(
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Object.keys(parsed).length === 0
      );
    } catch {
      hasValue = true;
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm">
            Auth JSON
          </Label>
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              hasValue ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {hasValue ? <ShieldCheck /> : <ShieldX />}
            {hasValue ? "Configured" : "Not configured"}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setIsRevealed((current) => !current)}
        >
          {isRevealed ? <EyeOff /> : <Eye />}
          {isRevealed ? "Hide" : "Edit"}
        </Button>
      </div>
      {isRevealed ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder='{"token": "xyz..."}'
          aria-label={`${serviceName} auth JSON`}
          wrap="soft"
          className="min-h-24 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap"
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border min-w-0 space-y-3 rounded-lg border p-3">
      <div className="flex items-center text-sm font-medium">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function UseAccountConfig({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <Label htmlFor={id} className="cursor-pointer text-xs">
        Use configuration from account settings
      </Label>
    </div>
  );
}

export function ProjectServicesConfig({
  value,
  disabled = false,
  onChange,
}: {
  value: ProjectServicesConfigValue;
  disabled?: boolean;
  onChange: (value: ProjectServicesConfigValue) => void;
}) {
  const update = (updates: Partial<ProjectServicesConfigValue>) =>
    onChange({ ...value, ...updates });

  const addContainer = (name: string, dockercomposecode = "") => {
    update({
      dockerContainers: [
        ...value.dockerContainers,
        { id: crypto.randomUUID(), name, dockercomposecode },
      ],
    });
  };

  return (
    <div className="min-w-0 space-y-2">
      <ServiceCard icon={<Package className="mr-2 size-4" />} title="Docker">
        {value.dockerContainers.map((container) => (
          <div
            key={container.id}
            className="border-border bg-card min-w-0 space-y-2 rounded-md border p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Input
                value={container.name}
                placeholder="Container name"
                disabled={disabled}
                onChange={(event) =>
                  update({
                    dockerContainers: value.dockerContainers.map((item) =>
                      item.id === container.id
                        ? { ...item, name: event.target.value }
                        : item,
                    ),
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${container.name}`}
                disabled={disabled}
                onClick={() =>
                  update({
                    dockerContainers: value.dockerContainers.filter(
                      (item) => item.id !== container.id,
                    ),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
            <Textarea
              value={container.dockercomposecode}
              placeholder="docker-compose.yml or Dockerfile code..."
              wrap="off"
              className="bg-muted/50 min-h-24 resize-y overflow-auto font-mono text-xs whitespace-pre"
              disabled={disabled}
              onChange={(event) =>
                update({
                  dockerContainers: value.dockerContainers.map((item) =>
                    item.id === container.id
                      ? { ...item, dockercomposecode: event.target.value }
                      : item,
                  ),
                })
              }
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed"
            disabled={disabled}
            onClick={() => addContainer("Custom Container")}
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
              disabled={disabled}
              onClick={() =>
                addContainer(preset.name, preset.dockercomposecode)
              }
            >
              <Plus />
              {preset.name}
            </Button>
          ))}
        </div>
      </ServiceCard>

      <ServiceCard icon={<Terminal className="mr-2 size-4" />} title="OpenCode">
        <UseAccountConfig
          id="opencode-use-user-config"
          checked={value.opencode.useUserConfig}
          disabled={disabled}
          onChange={(useUserConfig) =>
            update({ opencode: { ...value.opencode, useUserConfig } })
          }
        />
        <div className="min-w-0">
          <div className="space-y-1.5">
            <Label htmlFor="opencode-model" className="text-xs">
              AI model
            </Label>
            <Input
              id="opencode-model"
              value={value.opencode.model}
              placeholder="default"
              disabled={disabled}
              onChange={(event) =>
                update({
                  opencode: { ...value.opencode, model: event.target.value },
                })
              }
            />
          </div>
        </div>
        {!value.opencode.useUserConfig ? (
          <SensitiveAuthJsonField
            id="opencode-auth-json"
            serviceName="OpenCode"
            value={value.opencode.authJson}
            disabled={disabled}
            onChange={(authJson) =>
              update({ opencode: { ...value.opencode, authJson } })
            }
          />
        ) : null}
      </ServiceCard>

      <ServiceCard icon={<Bot className="mr-2 size-4" />} title="Codex">
        <UseAccountConfig
          id="codex-use-user-config"
          checked={value.codex.useUserConfig}
          disabled={disabled}
          onChange={(useUserConfig) =>
            update({ codex: { ...value.codex, useUserConfig } })
          }
        />
        {!value.codex.useUserConfig ? (
          <SensitiveAuthJsonField
            id="codex-auth-json"
            serviceName="Codex"
            value={value.codex.authJson}
            disabled={disabled}
            onChange={(authJson) =>
              update({ codex: { ...value.codex, authJson } })
            }
          />
        ) : null}
      </ServiceCard>

      <ServiceCard icon={<CircleDot className="mr-2 size-4" />} title="Pi">
        <UseAccountConfig
          id="pi-use-user-config"
          checked={value.pi.useUserConfig}
          disabled={disabled}
          onChange={(useUserConfig) =>
            update({ pi: { ...value.pi, useUserConfig } })
          }
        />
        {!value.pi.useUserConfig ? (
          <SensitiveAuthJsonField
            id="pi-auth-json"
            serviceName="Pi"
            value={value.pi.authJson}
            disabled={disabled}
            onChange={(authJson) => update({ pi: { ...value.pi, authJson } })}
          />
        ) : null}
      </ServiceCard>

      <ServiceCard icon={<Bot className="mr-2 size-4" />} title="FX">
        <UseAccountConfig
          id="fx-use-user-config"
          checked={value.fx.useUserConfig}
          disabled={disabled}
          onChange={(useUserConfig) =>
            update({ fx: { ...value.fx, useUserConfig } })
          }
        />
        {!value.fx.useUserConfig ? (
          <SensitiveAuthJsonField
            id="fx-auth-json"
            serviceName="FX"
            value={value.fx.authJson}
            disabled={disabled}
            onChange={(authJson) => update({ fx: { ...value.fx, authJson } })}
          />
        ) : null}
      </ServiceCard>
    </div>
  );
}
