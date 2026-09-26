import type { GetProjectOverviewParams } from "@repo/api-client";
import { Effect } from "effect";
import { getProjectOverview } from "../services/projects.js";

export function projects(options: GetProjectOverviewParams) {
  return Effect.flatMap(getProjectOverview(options), (overview) =>
    Effect.sync(() => {
      if (overview.data.length === 0) {
        console.log("No projects on this page.");
        return;
      }

      const lines: string[] = [];
      for (const project of overview.data) {
        lines.push(`${project.name} (${project.id})`);
        if (project.sessions.length === 0) {
          lines.push("  No active sessions.");
        }
        for (const session of project.sessions) {
          lines.push(`  ${session.name} (${session.id})`);
          for (const instance of session.instances) {
            lines.push(
              `    Running ${instance.runtime_kind} instance: ${instance.name} (${instance.id})`,
            );
          }
        }
      }

      if (overview.hasNext) {
        lines.push(`More projects: use --page ${overview.page + 1}`);
      }
      console.log(lines.join("\n"));
    }),
  );
}
