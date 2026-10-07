import { formatSshCommand, MobileClient, type SshAccessSummary } from "@repo/api-client";
import { Command } from "commander";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../lib/api.js";
import { getApiKey } from "../lib/credential-store.js";

type ServerOptions = { serverUrl: string };

async function withSshClient<T>(
  options: ServerOptions,
  action: (client: MobileClient) => Promise<T>,
  notFoundMessage: string,
): Promise<T> {
  const origin = normalizeServerUrl(options.serverUrl);
  const apiKey = await getApiKey(origin);
  if (!apiKey) {
    throw new Error(
      `Not logged in to ${origin}. Run vibeongo login${origin === DEFAULT_SERVER_URL ? "" : ` --server-url ${origin}`}.`,
    );
  }

  const client = new MobileClient(origin, apiKey);
  client.apiClient.defaults.timeout = 15_000;
  try {
    return await action(client);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      throw new Error(`API key rejected by ${origin}. Run vibeongo login again.`);
    }
    if (status === 404) throw new Error(notFoundMessage);
    if (status) throw new Error(`SSH access request failed (HTTP ${status}).`);
    throw new Error("Could not reach the Vibeongo server for SSH access.");
  }
}

async function createAccess(instanceId: string, options: ServerOptions): Promise<void> {
  const access = await withSshClient(
    options,
    (client) => client.sshAccess.createSshAccess(instanceId),
    "Running instance not found or unavailable for SSH.",
  );
  console.log(formatSshCommand(access));
  console.log(`Access ID: ${access.id}`);
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function printAccessList(accesses: SshAccessSummary[]): void {
  if (accesses.length === 0) {
    console.log("No SSH access found for this instance.");
    return;
  }
  for (const access of accesses) {
    console.log(`${access.id}  ${access.status}`);
    console.log(
      `  Created: ${formatDate(access.createdAt)}  Expires: ${formatDate(access.expiresAt)}  Last used: ${formatDate(access.lastUsedAt)}`,
    );
  }
}

function serverOption(command: Command): Command {
  return command.option(
    "--server-url <url>",
    "Vibeongo server origin",
    DEFAULT_SERVER_URL,
  );
}

export function createSshCommand(): Command {
  const command = serverOption(
    new Command("ssh")
      .description("Create, list, and revoke SSH access for an instance")
      .argument("[instance-id]", "Create access for this running instance"),
  ).action(async (instanceId: string | undefined, options: ServerOptions) => {
    if (!instanceId) {
      command.outputHelp();
      return;
    }
    await createAccess(instanceId, options);
  });

  serverOption(
    command
      .command("create")
      .description("Create SSH access for a running instance")
      .argument("<instance-id>", "Instance ID shown by vibeongo projects"),
  ).action(createAccess);

  serverOption(
    command
      .command("list")
      .description("List SSH access IDs and status for an instance")
      .argument("<instance-id>", "Instance ID shown by vibeongo projects"),
  ).action(async (instanceId: string, options: ServerOptions) => {
    const accesses = await withSshClient(
      options,
      (client) => client.sshAccess.listSshAccess(instanceId),
      "Instance not found.",
    );
    printAccessList(accesses);
  });

  serverOption(
    command
      .command("revoke")
      .description("Revoke one SSH access ID for an instance")
      .argument("<instance-id>", "Instance ID shown by vibeongo projects")
      .argument("<access-id>", "Access ID shown by vibeongo ssh list"),
  ).action(async (instanceId: string, accessId: string, options: ServerOptions) => {
    await withSshClient(
      options,
      (client) => client.sshAccess.revokeSshAccess({ instanceId, accessId }),
      "Instance or SSH access ID not found.",
    );
    console.log(`SSH access ${accessId} revoked.`);
  });

  return command;
}
