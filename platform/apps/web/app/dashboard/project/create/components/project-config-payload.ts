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
  provider: state.provider,
  regionId: state.instanceRegionId,
  instanceTypeId: state.instanceTypeId,
  sandboxTypeId: state.sandboxTypeId,
  sshKeyIds: state.sshKeys,
  githubRepoIds: state.gitRepoIds,
  initialScript: state.initialScript,
  finalScript: state.finalScript,
  devScript: state.devScript,
  config: {
    ports: state.portRules.map((rule) => ({
      port: Number(rule.port),
      protocol: rule.protocol,
    })),
    packages: [
      {
        name: "docker",
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
        config: {
          model: state.additionalServices.opencodeConfig.model,
          use_user_config:
            state.additionalServices.opencodeConfig.useUserConfig,
          requirePassword:
            state.additionalServices.opencodeConfig.requirePassword,
          auth_json: state.additionalServices.opencodeConfig.useUserConfig
            ? {}
            : parseAuthJson(
                state.additionalServices.opencodeConfig.authJson,
                "Opencode",
              ),
        },
      },
      {
        name: "codex",
        config: {
          use_user_config: state.additionalServices.codexConfig.useUserConfig,
          auth_json: state.additionalServices.codexConfig.useUserConfig
            ? {}
            : parseAuthJson(
                state.additionalServices.codexConfig.authJson,
                "Codex",
              ),
        },
      },
      {
        name: "pi",
        config: {
          use_user_config: state.additionalServices.piConfig.useUserConfig,
          auth_json: state.additionalServices.piConfig.useUserConfig
            ? {}
            : parseAuthJson(state.additionalServices.piConfig.authJson, "Pi"),
        },
      },
      {
        name: "nvim",
        config: {
          config_url: state.additionalServices.nvimConfig.config,
        },
      },
    ],
  },
});
