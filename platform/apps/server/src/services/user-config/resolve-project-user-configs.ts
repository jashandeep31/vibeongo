import { and, db, eq, inArray, userConfigs } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";
import { decryptData } from "../../lib/encryption-decryption.js";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];
type ProjectPackage = ProjectConfig["packages"][number];
type UserConfigType = "opencode" | "codex" | "pi" | "fx";
type AgentConfigType = Exclude<UserConfigType, "opencode">;
type UserConfigurablePackage = Extract<
  ProjectPackage,
  { name: UserConfigType }
>;

const agentConfigTypes = [
  "codex",
  "pi",
  "fx",
] as const satisfies readonly AgentConfigType[];

const userConfigValueSchema = z.record(z.string(), z.json());
type UserConfigValue = z.infer<typeof userConfigValueSchema>;

const isUserConfigurablePackage = (
  projectPackage: ProjectPackage,
): projectPackage is UserConfigurablePackage =>
  projectPackage.name === "opencode" ||
  projectPackage.name === "codex" ||
  projectPackage.name === "pi" ||
  projectPackage.name === "fx";

const replacePackageAuthJson = (
  projectPackage: UserConfigurablePackage,
  authJson: UserConfigValue,
): UserConfigurablePackage => {
  switch (projectPackage.name) {
    case "opencode":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: authJson },
      };
    case "codex":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: authJson },
      };
    case "pi":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: authJson },
      };
    case "fx":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: authJson },
      };
  }
};

const createAgentPackage = (
  configType: AgentConfigType,
  authJson: UserConfigValue,
): ProjectPackage => ({
  name: configType,
  config: { auth_json: authJson, use_user_config: true },
});

export const resolveProjectUserConfigs = async (
  projectConfig: ProjectConfig,
  userId: string,
  options: { includeUnusedAgentConfigs?: boolean } = {},
): Promise<ProjectConfig> => {
  const requestedConfigTypeSet = new Set<UserConfigType>(
    projectConfig.packages
      .filter(isUserConfigurablePackage)
      .filter((projectPackage) => projectPackage.config.use_user_config)
      .map((projectPackage) => projectPackage.name),
  );

  if (options.includeUnusedAgentConfigs) {
    agentConfigTypes.forEach((configType) =>
      requestedConfigTypeSet.add(configType),
    );
  }

  const requestedConfigTypes = [...requestedConfigTypeSet];

  if (requestedConfigTypes.length === 0) return projectConfig;

  const configRows = await db
    .select({
      config_type: userConfigs.config_type,
      iv: userConfigs.iv,
      tag: userConfigs.tag,
      encrypted_config: userConfigs.encrypted_config,
    })
    .from(userConfigs)
    .where(
      and(
        eq(userConfigs.user_id, userId),
        inArray(userConfigs.config_type, requestedConfigTypes),
      ),
    );

  const decryptedConfigs = new Map<UserConfigType, UserConfigValue>();

  for (const configRow of configRows) {
    const decryptedConfig = userConfigValueSchema.parse(
      JSON.parse(
        decryptData({
          iv: configRow.iv,
          tag: configRow.tag,
          encrypted: configRow.encrypted_config,
        }),
      ),
    );
    decryptedConfigs.set(configRow.config_type, decryptedConfig);
  }

  const resolvedPackages = projectConfig.packages.map((projectPackage) => {
    if (
      !isUserConfigurablePackage(projectPackage) ||
      !projectPackage.config.use_user_config
    ) {
      return projectPackage;
    }

    const userConfig = decryptedConfigs.get(projectPackage.name);
    if (!userConfig) return projectPackage;

    return replacePackageAuthJson(projectPackage, userConfig);
  });

  if (!options.includeUnusedAgentConfigs) {
    return { ...projectConfig, packages: resolvedPackages };
  }

  const configuredPackageNames = new Set(
    resolvedPackages.map((projectPackage) => projectPackage.name),
  );
  const missingAgentPackages = agentConfigTypes.flatMap((configType) => {
    if (configuredPackageNames.has(configType)) return [];

    const userConfig = decryptedConfigs.get(configType);
    return userConfig ? [createAgentPackage(configType, userConfig)] : [];
  });

  return {
    ...projectConfig,
    packages: [...resolvedPackages, ...missingAgentPackages],
  };
};
