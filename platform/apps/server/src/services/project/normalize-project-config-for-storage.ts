import { projectConfigValidator, z } from "@repo/shared";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];
type ProjectPackage = ProjectConfig["packages"][number];
type UserConfigurablePackage = Extract<
  ProjectPackage,
  { name: "opencode" | "codex" | "pi" | "fx" }
>;

const createDefaultProjectPackages = (): ProjectPackage[] => [
  {
    name: "docker",
    config: { containers: [] },
  },
  {
    name: "opencode",
    config: {
      auth_json: {},
      use_user_config: true,
      model: "default",
      requirePassword: false,
    },
  },
  {
    name: "codex",
    config: { auth_json: {}, use_user_config: true },
  },
  {
    name: "pi",
    config: { auth_json: {}, use_user_config: true },
  },
  {
    name: "fx",
    config: { auth_json: {}, use_user_config: true },
  },
];

const addMissingProjectPackages = (
  packages: ProjectPackage[],
): ProjectPackage[] => {
  const configuredPackages = new Map<ProjectPackage["name"], ProjectPackage>();

  for (const projectPackage of packages) {
    if (!configuredPackages.has(projectPackage.name)) {
      configuredPackages.set(projectPackage.name, projectPackage);
    }
  }

  return createDefaultProjectPackages().map(
    (defaultPackage) =>
      configuredPackages.get(defaultPackage.name) ?? defaultPackage,
  );
};

const isUserConfigurablePackage = (
  projectPackage: ProjectPackage,
): projectPackage is UserConfigurablePackage =>
  projectPackage.name === "opencode" ||
  projectPackage.name === "codex" ||
  projectPackage.name === "pi" ||
  projectPackage.name === "fx";

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
    case "fx":
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
  packages: addMissingProjectPackages(projectConfig.packages).map(
    (projectPackage) => {
      if (
        !isUserConfigurablePackage(projectPackage) ||
        !projectPackage.config.use_user_config
      ) {
        return projectPackage;
      }

      return removeEmbeddedAccountAuth(projectPackage);
    },
  ),
});
