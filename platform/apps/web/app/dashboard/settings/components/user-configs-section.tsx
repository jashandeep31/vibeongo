"use client";

import { useUserConfigs } from "@/hooks/use-user";
import { UserConfigDialog } from "@/components/dialogs/user-config-dialog";
import { Skeleton } from "@repo/ui/components/skeleton";

const configTypes = [
  {
    type: "opencode",
    name: "OpenCode",
    description: "Manage your OpenCode authentication configuration.",
  },
  {
    type: "codex",
    name: "Codex",
    description: "Manage your Codex authentication configuration.",
  },
  {
    type: "pi",
    name: "Pi",
    description: "Manage your Pi authentication configuration.",
  },
] as const;

export function UserConfigsSection() {
  const { data: userConfigs = [], isLoading, isError } = useUserConfigs();

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-lg font-semibold">Tool configurations</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure authentication for the tools you use.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {configTypes.map((config) => {
          const isConfigured = userConfigs.some(
            (userConfig) => userConfig.config_type === config.type,
          );

          return (
            <div
              key={config.type}
              className="bg-card flex min-h-40 flex-col rounded-lg border p-4"
            >
              <div className="flex-1">
                <h3 className="font-medium">{config.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {config.description}
                </p>
              </div>

              {isLoading ? (
                <Skeleton className="mt-5 h-9 w-full" />
              ) : isError ? (
                <p className="text-destructive mt-5 text-sm">
                  Failed to load configuration.
                </p>
              ) : (
                <UserConfigDialog
                  configType={config.type}
                  name={config.name}
                  isConfigured={isConfigured}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
