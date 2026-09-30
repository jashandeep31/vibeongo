import { and, db, eq, inArray, userConfigs } from "@repo/db";
import {
  opencodeCredentialsValidator,
  projectConfigValidator,
  z,
} from "@repo/shared";
import { decryptData } from "../../lib/encryption-decryption.js";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];
type ProjectPackage = ProjectConfig["packages"][number];
type UserConfigType = (typeof userConfigs.$inferSelect)["config_type"];
type UserConfigurablePackage = Extract<
  ProjectPackage,
  { name: UserConfigType }
>;

const userConfigValueSchema = z.record(z.string(), z.json());
type UserConfigValue = z.infer<typeof userConfigValueSchema>;

const isUserConfigurablePackage = (
  projectPackage: ProjectPackage,
): projectPackage is UserConfigurablePackage =>
  projectPackage.name === "opencode" ||
  projectPackage.name === "codex" ||
  projectPackage.name === "pi" ||
  projectPackage.name === "fx" ||
  projectPackage.name === "claude";

// Returns the package unchanged when the stored user config has the wrong shape,
// so an old OpenCode auth.json object is never sent to the instance
const replacePackageAuthJson = (
  projectPackage: UserConfigurablePackage,
  userConfig: unknown,
): UserConfigurablePackage => {
  if (projectPackage.name === "opencode") {
    const credentials = opencodeCredentialsValidator.safeParse(userConfig);
    if (!credentials.success) return projectPackage;
    return {
      ...projectPackage,
      config: { ...projectPackage.config, auth_json: credentials.data },
    };
  }

  const parsedConfig = userConfigValueSchema.safeParse(userConfig);
  if (!parsedConfig.success) return projectPackage;
  const authJson: UserConfigValue = parsedConfig.data;

  switch (projectPackage.name) {
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
    case "claude":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: authJson },
      };
  }
};

export const resolveProjectUserConfigs = async (
  projectConfig: ProjectConfig,
  userId: string,
): Promise<ProjectConfig> => {
  const requestedConfigTypes = [
    ...new Set(
      projectConfig.packages
        .filter(isUserConfigurablePackage)
        .filter((projectPackage) => projectPackage.config.use_user_config)
        .map((projectPackage) => projectPackage.name),
    ),
  ];

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

  const decryptedConfigs = new Map<UserConfigType, unknown>();

  for (const configRow of configRows) {
    const decryptedConfig: unknown = JSON.parse(
      decryptData({
        iv: configRow.iv,
        tag: configRow.tag,
        encrypted: configRow.encrypted_config,
      }),
    );
    decryptedConfigs.set(configRow.config_type, decryptedConfig);
  }

  return {
    ...projectConfig,
    packages: projectConfig.packages.map((projectPackage) => {
      if (
        !isUserConfigurablePackage(projectPackage) ||
        !projectPackage.config.use_user_config
      ) {
        return projectPackage;
      }

      const userConfig = decryptedConfigs.get(projectPackage.name);
      if (userConfig === undefined) return projectPackage;

      return replacePackageAuthJson(projectPackage, userConfig);
    }),
  };
};
