export type StoredProjectPackage = {
  name: string;
  config?: Record<string, unknown>;
};

export type StoredProjectConfig = {
  ports?: {
    port: number | string;
    protocol: "TCP" | "UDP";
  }[];
  packages?: StoredProjectPackage[];
};

export const getProjectPackage = (config: StoredProjectConfig, name: string) =>
  config.packages?.find((projectPackage) => projectPackage.name === name);

export const getDockerContainers = (
  dockerPackage: StoredProjectPackage | undefined,
) => {
  const containers = dockerPackage?.config?.containers;

  if (!Array.isArray(containers)) return [];

  return containers.flatMap((container) => {
    if (
      !container ||
      typeof container !== "object" ||
      !("name" in container) ||
      typeof container.name !== "string"
    ) {
      return [];
    }

    return [
      {
        id: crypto.randomUUID(),
        name: container.name,
        dockercomposecode:
          "dockercomposecode" in container &&
          typeof container.dockercomposecode === "string"
            ? container.dockercomposecode
            : "",
      },
    ];
  });
};

export const formatAuthJsonForForm = (authJson: unknown) => {
  if (authJson === undefined || authJson === null || authJson === "") return "";

  if (typeof authJson === "string") {
    try {
      return JSON.stringify(JSON.parse(authJson), null, 2);
    } catch {
      return authJson;
    }
  }

  return JSON.stringify(authJson, null, 2);
};
