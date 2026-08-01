import { projectConfigValidator, z } from "@repo/shared";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];

const supportedPackageNames = new Set(["docker", "opencode", "codex", "pi"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isSupportedPackage = (value: unknown) =>
  isRecord(value) &&
  typeof value.name === "string" &&
  supportedPackageNames.has(value.name);

export const parseStoredProjectConfig = (
  serializedConfig: string,
): ProjectConfig => {
  const config: unknown = JSON.parse(serializedConfig);

  if (!isRecord(config) || !Array.isArray(config.packages)) {
    return projectConfigValidator.shape.config.parse(config);
  }

  return projectConfigValidator.shape.config.parse({
    ...config,
    packages: config.packages.filter(isSupportedPackage),
  });
};
