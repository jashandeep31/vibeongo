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
    gitRepos,
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
    config: {
      sshKeys: sshKeys.map((key) => key),
      ports: portRules.map((rule) => ({
        port: parseInt(rule.port, 10),
        protocol: rule.protocol,
      })),

      repos: gitRepos.map((repo) => ({
        git_url: repo.git_url,
        access_token: repo.access_token,
        folder_name: repo.folder_name,
        setup_script: repo.setup_script || "",
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
            auth_json: additionalServices.opencodeConfig.authJson,
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
            } catch {
              toast.error("Failed to create project", { id: toastId });
            }
          }}
        >
          Create Project
        </Button>
      </div>
      <div className="bg-muted w-[80vw] overflow-auto rounded-md p-4 text-xs">
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
    </>
  );
}
