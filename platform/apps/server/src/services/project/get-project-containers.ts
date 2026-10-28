import { getDecryptedProjectConfig } from "./project-config.js";
import { parseStoredProjectConfig } from "./parse-stored-project-config.js";
import { assertProjectOwner } from "./project-network.js";

export async function getProjectContainers(userId: string, projectId: string) {
  await assertProjectOwner(userId, projectId);
  const config = parseStoredProjectConfig(
    await getDecryptedProjectConfig(projectId),
  );
  return {
    containers: config.packages.flatMap((item) =>
      item.name === "docker"
        ? item.config.containers.map((container) => ({ name: container.name }))
        : [],
    ),
    configuredPorts: config.ports,
    source:
      "Saved project configuration; not live Docker state. Container names and project ports do not imply a verified container-to-port mapping.",
  };
}
