import { Effect } from "effect";
import { getProjectWithDetails } from "../services/projects.js";

export function project(id: string) {
  return Effect.flatMap(getProjectWithDetails(id), (details) =>
    Effect.sync(() => {
      const lines = [
        `${details.name} (${details.id})`,
        details.description,
        details.overview,
        "",
        "Repositories:",
        ...details.repositories.map(
          (repo) =>
            `  ${repo.full_name} (${repo.id})${repo.setupScriptConfigured ? " · setup script configured" : ""}`,
        ),
        "SSH keys:",
        ...details.sshKeys.map((key) => `  ${key.name} (${key.id})`),
        "Deployment:",
        `  VM: ${details.deployment.vm?.name ?? "None"}`,
        `  Sandbox: ${details.deployment.sandbox?.name ?? "None"}`,
        `Ports: ${details.configuration.ports.map(({ port, protocol }) => `${port}/${protocol}`).join(", ") || "None"}`,
        "Packages:",
        ...details.configuration.packages.map((item) => {
          if (item.name === "docker") {
            return `  docker: ${item.containers.join(", ") || "no containers"}`;
          }
          if (item.name === "opencode") {
            return `  opencode: model ${item.model}, user config ${item.useUserConfig ? "enabled" : "disabled"}`;
          }
          return `  ${item.name}: user config ${item.useUserConfig ? "enabled" : "disabled"}`;
        }),
        `Scripts: initial ${details.scripts.initialConfigured ? "configured" : "none"}, final ${details.scripts.finalConfigured ? "configured" : "none"}, dev ${details.scripts.devConfigured ? "configured" : "none"}`,
      ];
      console.log(lines.filter((line) => line !== null).join("\n"));
    }),
  );
}
