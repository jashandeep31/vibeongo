import { projectConfigValidator, z } from "@repo/shared";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];
type ProjectPackage = ProjectConfig["packages"][number];
type UserConfigurablePackage = Extract<
  ProjectPackage,
  { name: "opencode" | "codex" | "pi" }
>;

const isUserConfigurablePackage = (
  projectPackage: ProjectPackage,
): projectPackage is UserConfigurablePackage =>
  projectPackage.name === "opencode" ||
  projectPackage.name === "codex" ||
  projectPackage.name === "pi";

const removeEmbeddedAccountAuth = (
  projectPackage: UserConfigurablePackage,
): UserConfigurablePackage => {
  switch (projectPackage.name) {
    case "opencode":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: {} },
      };
    case "codex":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: {} },
      };
    case "pi":
      return {
        ...projectPackage,
        config: { ...projectPackage.config, auth_json: {} },
      };
  }
};

export const normalizeProjectConfigForStorage = (
  projectConfig: ProjectConfig,
): ProjectConfig => ({
  ...projectConfig,
  packages: projectConfig.packages.map((projectPackage) => {
    if (
      !isUserConfigurablePackage(projectPackage) ||
      !projectPackage.config.use_user_config
    ) {
      return projectPackage;
    }

    return removeEmbeddedAccountAuth(projectPackage);
  }),
});
