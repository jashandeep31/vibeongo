import { useConfigStore } from "@/store/config-store";
import { projectConfigValidator, z } from "@repo/shared";

type ConfigStoreState = ReturnType<typeof useConfigStore.getState>;

const parseAuthJson = (authJson: string, serviceName: string) => {
  const trimmedAuthJson = authJson.trim();

  if (!trimmedAuthJson) return {};

  try {
    return JSON.parse(trimmedAuthJson);
  } catch {
    throw new Error(`Invalid ${serviceName} auth JSON`);
  }
};

export const buildProjectConfigPayload = (
  state: ConfigStoreState,
): z.infer<typeof projectConfigValidator> => ({
  name: state.projectName,
  description: "",
  regionId: state.instanceRegionId,
  instanceTypeId: state.instanceTypeId,
  sshKeyIds: state.sshKeys,
  githubRepoIds: state.gitRepoIds,
  initialScript: state.initialScript,
  finalScript: state.finalScript,
  devScript: state.devScript,
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
              dockercomposecode: container.dockercomposecode,
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
          auth_json: parseAuthJson(
            state.additionalServices.opencodeConfig.authJson,
            "Opencode",
          ),
        },
      },
      {
        name: "codex",
        enabled: state.additionalServices.codexConfig.enabled || false,
        config: {
          auth_json: parseAuthJson(
            state.additionalServices.codexConfig.authJson,
            "Codex",
          ),
        },
      },
      {
        name: "pi",
        enabled: state.additionalServices.piConfig.enabled || false,
        config: {
          auth_json: parseAuthJson(
            state.additionalServices.piConfig.authJson,
            "Pi",
          ),
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
