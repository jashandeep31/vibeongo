"use client";

import { Button } from "@repo/ui/components/button";
import { useConfigStore } from "@/store/config-store";
import { useCreateProject } from "@/hooks/use-project";
import { projectConfigValidator, z } from "@repo/shared";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ConfigPreviewAndCreate() {
  const router = useRouter();
  const {
    gitRepoIds,
    projectName,
    sshKeys,
    portRules,
    additionalServices,
    instanceTypeId,
    instanceRegionId,
  } = useConfigStore();
  const { mutateAsync } = useCreateProject();

  const config: z.infer<typeof projectConfigValidator> = {
    name: projectName,
    description: "coming soon feature",
    regionId: instanceRegionId,
    instanceTypeId: instanceTypeId,
    sshKeyIds: sshKeys,
    githubRepoIds: gitRepoIds,
    config: {
      ports: portRules.map((rule) => ({
        port: parseInt(rule.port, 10),
        protocol: rule.protocol,
      })),
      packages: [
        {
          name: "docker",
          enabled: additionalServices.dockerConfig.enabled || false,
          config: {
            containers: additionalServices.dockerConfig.containers.map((c) => ({
              name: c.name,
              content: c.content,
            })),
          },
        },
        {
          name: "opencode",
          enabled: additionalServices.opencodeConfig.enabled || false,
          config: {
            model: additionalServices.opencodeConfig.model,
            auth_json: (() => {
              try {
                return JSON.parse(
                  additionalServices.opencodeConfig.authJson || "{}",
                );
              } catch {
                return {
                  error: "Invalid JSON",
                  raw: additionalServices.opencodeConfig.authJson,
                };
              }
            })(),
          },
        },
        {
          name: "nvim",
          enabled: additionalServices.nvimConfig.enabled || false,
          config: {
            config_url: additionalServices.nvimConfig.config,
          },
        },
      ],
    },
  };
  return (
    <>
      <div>
        <Button
          onClick={async () => {
            const toastId = toast.loading("Creating project");
            try {
              projectConfigValidator.parse(config);
              await mutateAsync({
                ...config,
              });
              //TODO: reset the form or even better redirect to the project dashboard
              toast.success("Project created", { id: toastId });
              router.push("/dashboard");
            } catch (error) {
              console.error(error);
              toast.error("Failed to create project", { id: toastId });
            }
          }}
        >
          Create Project
        </Button>
      </div>
    </>
  );
}
