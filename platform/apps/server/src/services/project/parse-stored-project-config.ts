import {
  opencodeCredentialsValidator,
  projectConfigValidator,
  z,
} from "@repo/shared";

type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];

const supportedPackageNames = new Set([
  "docker",
  "opencode",
  "codex",
  "pi",
  "fx",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isSupportedPackage = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) &&
  typeof value.name === "string" &&
  supportedPackageNames.has(value.name);

// OpenCode credentials used to be stored as the auth.json object. Only the
// `opencode auth export` array can be imported, so anything else is dropped.
const dropInvalidOpencodeCredentials = (value: Record<string, unknown>) => {
  if (value.name !== "opencode" || !isRecord(value.config)) return value;
  if (opencodeCredentialsValidator.safeParse(value.config.auth_json).success) {
    return value;
  }
  return { ...value, config: { ...value.config, auth_json: [] } };
};

export const parseStoredProjectConfig = (
  serializedConfig: string,
): ProjectConfig => {
  const config: unknown = JSON.parse(serializedConfig);

  if (!isRecord(config) || !Array.isArray(config.packages)) {
    return projectConfigValidator.shape.config.parse(config);
  }

  return projectConfigValidator.shape.config.parse({
    ...config,
    packages: config.packages
      .filter(isSupportedPackage)
      .map(dropInvalidOpencodeCredentials),
  });
};
