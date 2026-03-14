"use client";

import { Button } from "@repo/ui/components/button";
import { useConfigStore } from "@/store/config-store";
import { useCreateProject } from "@/hooks/use-project";
import { projectConfigValidator, z } from "@repo/shared";

export default function ConfigPreviewAndCreate() {
  const { gitRepos, projectName, sshKeys, portRules, additionalServices } =
    useConfigStore();
  const { mutate } = useCreateProject();

  const config: z.infer<typeof projectConfigValidator> = {
    name: projectName,
    description: "coming soon feature",
    ssh_keys: sshKeys.map((key) => key),
    ports: portRules.map((rule) => ({
      port: parseInt(rule.port, 10),
      protocol: rule.protocol,
    })),

    repos: gitRepos.map((repo) => ({
      git_url: repo.git_url,
      access_token: repo.access_token,
    })),
    packages: [
      {
        name: "docker",
        enabled: additionalServices.dockerConfig.enabled || false,
        config: additionalServices.dockerConfig.containers as any,
      },
      {
        name: "opencode",
        enabled: additionalServices.opencodeConfig.enabled || false,
        config: additionalServices.opencodeConfig.authJson as any,
      },
      {
        name: "nvim",
        enabled: additionalServices.nvimConfig.enabled || false,
        config: additionalServices.nvimConfig.config as any,
      },
    ],
  };
  console.log(config);
  return (
    <>
      <div>
        <Button
          onClick={() => {
            mutate({
              ...config,
            });
          }}
        >
          Create Project
        </Button>
      </div>
      <div className="bg-muted overflow-auto rounded-md p-4 text-xs">
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
    </>
  );
}
