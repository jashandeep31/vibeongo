import { stripVTControlCharacters } from "node:util";
import { Command } from "commander";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../lib/api.js";
import { getApiKey } from "../lib/credential-store.js";
import {
  ApiHttpError,
  CliApi,
  type ProjectOverview,
} from "../lib/remote-api.js";

const PAGE_SIZE = 100;

async function loadProjects(serverUrl: string): Promise<ProjectOverview[]> {
  const origin = normalizeServerUrl(serverUrl);
  const apiKey = await getApiKey(origin);
  if (!apiKey) {
    throw new Error(
      `Not logged in to ${origin}. Run vibeongo login${origin === DEFAULT_SERVER_URL ? "" : ` --server-url ${origin}`}.`,
    );
  }

  const client = new CliApi(origin, apiKey);
  const projects: ProjectOverview[] = [];
  try {
    for (let page = 1; page <= 1000; page += 1) {
      const response = await client.getProjectOverview(page, PAGE_SIZE);
      projects.push(...response.data);
      if (!response.hasNext) return projects;
      if (response.data.length === 0)
        throw new Error(
          "The server returned an empty overview page before the end.",
        );
    }
  } catch (error) {
    const status = error instanceof ApiHttpError ? error.status : undefined;
    if (status === 401 || status === 403) {
      throw new Error(
        `API key rejected by ${origin}. Run vibeongo login again.`,
      );
    }
    if (status)
      throw new Error(`Could not load project overview (HTTP ${status}).`);
    if (
      error instanceof Error &&
      error.message.startsWith("The server returned")
    )
      throw error;
    throw new Error(
      "Could not reach the Vibeongo server for project overview.",
    );
  }
  throw new Error("Project overview contains too many pages to display.");
}

function label(value: string | null | undefined): string {
  return (
    stripVTControlCharacters(value ?? "")
      .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim() || "-"
  );
}

function printProjects(projects: ProjectOverview[]): void {
  if (projects.length === 0) {
    console.log("No projects found.");
    return;
  }

  projects.forEach((project, projectIndex) => {
    if (projectIndex > 0) console.log();
    console.log(`${label(project.name)} (${label(project.id)})`);

    project.sessions.forEach((session, sessionIndex) => {
      const lastSession = sessionIndex === project.sessions.length - 1;
      console.log(
        `${lastSession ? "└──" : "├──"} ${label(session.name)} (${label(session.id)})`,
      );

      session.instances.forEach((instance, instanceIndex) => {
        const branch =
          instanceIndex === session.instances.length - 1 ? "└──" : "├──";
        const prefix = lastSession ? "    " : "│   ";
        console.log(
          `${prefix}${branch} ${label(instance.name)} (${label(instance.id)}) [${label(instance.state)}, ${label(instance.runtime_kind)}]`,
        );
      });
    });
  });
}

export function createProjectsCommand(): Command {
  return new Command("projects")
    .description(
      "Show projects, their sessions, and active instances as a tree",
    )
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .action(async (options: { serverUrl: string }) => {
      printProjects(await loadProjects(options.serverUrl));
    });
}
