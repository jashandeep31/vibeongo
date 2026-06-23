import { useConfigStore } from "@/store/config-store";
import { projectConfigValidator, z } from "@repo/shared";

type ConfigStoreState = ReturnType<typeof useConfigStore.getState>;

export const buildProjectConfigPayload = (
  state: ConfigStoreState,
): z.infer<typeof projectConfigValidator> => ({
  name: state.projectName,
  description: "",
  regionId: state.instanceRegionId,
  instanceTypeId: state.instanceTypeId,
  sshKeyIds: state.sshKeys,
  githubRepoIds: state.gitRepoIds,
  initial_script: state.initialScript,
  final_script: state.finalScript,
  config: {
    ports: state.portRules.map((rule) => ({
      port: parseInt(rule.port, 10),
      protocol: rule.protocol,
    })),
    packages: [
      {
        name: "docker",
        enabled: state.additionalServices.dockerConfig.enabled || false,
        config: {
          containers: state.additionalServices.dockerConfig.containers.map(
            (container) => ({
              name: container.name,
              content: container.content,
            }),
          ),
        },
      },
      {
        name: "opencode",
        enabled: state.additionalServices.opencodeConfig.enabled || false,
        config: {
          model: state.additionalServices.opencodeConfig.model,
          requirePassword:
            state.additionalServices.opencodeConfig.requirePassword,
          auth_json: (() => {
            try {
              return JSON.parse(
                state.additionalServices.opencodeConfig.authJson || "{}",
              );
            } catch {
              return {
                error: "Invalid JSON",
                raw: state.additionalServices.opencodeConfig.authJson,
              };
            }
          })(),
        },
      },
      {
        name: "nvim",
        enabled: state.additionalServices.nvimConfig.enabled || false,
        config: {
          config_url: state.additionalServices.nvimConfig.config,
        },
      },
    ],
  },
});
