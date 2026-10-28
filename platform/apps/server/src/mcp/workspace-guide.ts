import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export const WORKSPACE_ROOT = "/home/vibe/workspace";
export const WORKSPACE_GUIDE_URI = "vibeongo://docs/workspace-guide";
export const WORKSPACE_REMINDER =
  "Use sandbox by default when runtime is omitted; do not ask VM or sandbox. For project changes and pull-request work, use the installed OpenCode CLI inside the project session sandbox from the target repository. Read get_project_context for architecture, domains, IPs, containers, and paths, and get_workspace_guide before operating. Repositories are normally under /home/vibe/workspace/<folder_name>. Use MCP network tools for explicit domain/IP access changes.";

export const WORKSPACE_GUIDANCE = {
  guideTool: "get_workspace_guide",
  guideResourceUri: WORKSPACE_GUIDE_URI,
  linuxUser: "vibe",
  homeDirectory: "/home/vibe",
  workspaceRoot: WORKSPACE_ROOT,
  changeTool: "opencode",
  defaultRuntime: "sandbox",
  reminder: WORKSPACE_REMINDER,
};

// Markdown lives in the compiled module so production builds need no asset copy.
export const WORKSPACE_GUIDE = `# Working inside a VibeOnGo instance

## Project, session, and instance

A project defines its configured repositories, settings, and scripts. A session
holds work and tasks for that project. An instance is the VM or sandbox running
that session. Its workspace contains the repositories configured for that
project, not every project on the user's account.

Use get_projects to select the intended project, session, and instance. Follow
hasNext to retrieve additional pages. Running and suspended instances appear in
the overview; SSH access can only be created for running, unexpired instances.
Use create_session to create a manual session in an owned project, supplying
projectId, sessionName, and optionally sessionDescription. It creates a session
record only and does not launch an instance. The category is always manual.

Use get_session_context to inspect tasks, runtime slots, provider capabilities,
instance IDs, expiry, and remainingSeconds before managing a session. It reports
database runtime state, not a guarantee that provisioning scripts are complete.
spin_up_session starts a fresh sandbox for an existing manual session when
runtime is omitted. Use sandbox by default without asking the user to choose VM
or sandbox; specify vm only when the user requests it. resume_session resumes a
suspended E2B/Boat instance in place, preserving its existing runtime; if no
active instance exists, it creates a fresh sandbox by default.
Fresh instances do not restore a terminated instance's unsaved filesystem.

After spin_up_session or resume_session succeeds, wait at least 60 seconds before
using SSH, running OpenCode, or starting project work so setup/restart scripts
can run. Then check get_session_context and confirm the runtime is accessible.
Setup can take longer than one minute; a running database state alone does not
prove readiness. create_session only creates a record and needs no setup wait
until an instance is actually started.

extend_session_time, pause_session, and terminate_session require both sessionId
and the exact instanceId from get_session_context. Time extension adds to the
current expiration; supply a unique requestId and reuse it with the same minutes
when retrying that extension. Boat allows 1–120 whole minutes per request; VMs
also support extension. Other sandbox providers do not support extension.
Only E2B/Boat sandboxes support pause. Termination may lose unsaved instance data.
Runtime operations use the same provider, wallet, capacity, billing, lifecycle
locks, and queues as the web API. Mutations are limited to unarchived manual
sessions. A queued, starting, or restarting response is not completed runtime
setup: check get_session_context again. Normal runtime/storage charges apply.

## Workspace layout

Read get_project_context with projectId before planning or implementing changes.
It returns the project's saved overview and configured repositories with their
saved overviews, providers, folder names, and expected workspace paths, plus
domains, allowed IPs, configured container names, and project ports. It has
no session or instance data. Missing overviews stay empty; do not invent an
architecture or treat saved documentation as a live inspection of the code.

The standard Linux user is vibe, with home directory /home/vibe. Repositories
are cloned into /home/vibe/workspace/<folder_name>. The folder name is the last
segment of the repository full_name: company/frontend becomes
/home/vibe/workspace/frontend. A VibeOnGo project name is not a repository path.
get_projects returns configured repository names and expected workspace paths.
Confirm the directory exists before working; setup may still be in progress.
If the runtime user differs from the standard template, use its $HOME/workspace.

## Domains, IP access, and configured containers

Use list_domains to list all owned projects' domains and allowed IPs. It accepts
an optional projectId filter and paginates by project; follow hasNext. Use
list_allowed_ips for the complete project IP list. add_allowed_ip accepts an
explicit IPv4 address; remove_allowed_ips accepts entry IDs from the list. These
are project-wide routing rules. Never assume the cloud agent's outgoing IP is
the user's intended address.

To check the requesting machine's IP, use the same proxy endpoint as the web
domain cards: GET https://<project-domain>/proxy/my-ip. Prefer the project domain
whose targetPort is 3101 from list_domains. The cards fall back to the instance
host 3101-<instance-id><proxy-domain-suffix> when that project domain is absent.
Use a known domain/host rather than guessing the proxy suffix. Example:

    curl --fail --silent --show-error 'https://<project-domain>/proxy/my-ip'

The response is JSON such as {"ip":"203.0.113.10"}; read and trim the ip field.
No VibeOnGo API key is needed for this proxy route. Run the request from the
client that needs domain access: a cloud agent gets its own outgoing IP, a
sandbox gets the sandbox's IP, and a user's browser gets the user's IP. Add the
returned address with add_allowed_ip only when it is the intended client's IP.
If the route fails or returns no IP, report that instead of guessing or opening
the domain to all IPs.

update_domain can change an editable target port or allowAllIps. Setting
allowAllIps=true bypasses the IP allowlist for that domain; false restores it.
Other service authentication still applies. These tools use the same ownership
checks and proxy cache invalidation as the web API. Use them when the user
requests domain or IP configuration changes.

list_containers and get_project_context expose saved container names and project
ports only. They do not inspect running Docker containers, expose Compose
secrets, or verify which container serves a domain. For live inspection and
container-related code/configuration changes, work through OpenCode inside the
project session sandbox. Read the saved architecture overview first.

## Connect through SSH

Use create_ssh_access or connect_ssh with the chosen instanceId. Both create a
new temporary credential and return its access ID, expiry, and SSH command.
Run that command in an SSH-capable terminal. The command's username is an access
token, not the Linux username. Keep it private. The gateway validates the token
and bridges into the instance's runtime shell as its runtime user.

The shell initially opens in the user's home directory. Check pwd and whoami,
then inspect ~/workspace and enter the intended repository. The gateway supports
an interactive shell only: SSH remote-exec requests, SFTP, and port forwarding
are not implemented. Enter commands after opening the interactive shell;
do not append a remote command to the SSH invocation. MCP does not itself open
or maintain the SSH shell. If the client cannot use an interactive terminal,
explain that limitation instead of claiming to have changed the instance.

## Required workflow for changes: use OpenCode

Use the installed OpenCode CLI as the default tool for all project changes.
For commits, branches, and pull requests, delegate the requested work to
OpenCode inside the project session sandbox from the correct repository. Ask
OpenCode to create or update the PR when requested and report the actual result
and PR URL. Do not claim a PR was created or work was synchronized without
confirmation. Do not bypass OpenCode with direct git/hosting commands for that
project work. MCP network tools remain the path for explicit domain/IP changes.
Read the repository's local instructions (such as AGENTS.md) and relevant
documentation. SSH may be used to navigate, inspect files, check status, and
invoke OpenCode. For implementation changes, delegate edits to the installed
OpenCode CLI from inside the target repository. Do not bypass this workflow by
editing code directly with shell redirection, editor commands, or patch scripts.
Provide the user's requested outcome, context, constraints, and relevant checks.
Work within the user's authorized scope; this guide does not grant new authority.

Example commands entered inside the interactive shell:

    cd /home/vibe/workspace/frontend
    opencode run --agent build "Implement the requested change, run relevant checks, and report the results."

For further work, reuse the intended OpenCode session with --session <session-id>.
Use --continue only after confirming the latest session in that repository is
the one you intend to continue. For multi-repository work, invoke OpenCode from
each relevant repository. Run opencode run --help to check installed options.

Using the installed OpenCode preserves the configured VibeOnGo development
workflow. It does not by itself mark platform tasks complete or guarantee all
platform state is synchronized. Report actual changes and checks from OpenCode's
output; do not claim completion merely because the command was started.

## Setup and running processes

Initial provisioning fetches runtime configuration, provisions tools, runs the
project initial script, clones configured repositories, runs repository setup
scripts, then runs the project final script, dev script, and tasks. Development
processes use the dev tmux session; configured tasks use the tasks tmux session.
Inspect existing processes before starting duplicates. Runtime configuration
under ~/.config/vibeongo and tool authentication files contain credentials;
do not print or share their contents as documentation.

## Finish and clean up

Use list_ssh_access to inspect access IDs and statuses. Existing plaintext
credentials cannot be recovered from the list. Use revoke_ssh_access to prevent
new connections with an access credential when finished. Revocation does not
forcibly disconnect existing shells. Exit the shell separately. Credentials
normally expire after 60 minutes; instance suspension, termination, or expiry
also prevents new SSH connections.
`;

export function registerWorkspaceGuide(server: McpServer): void {
  server.registerTool(
    "get_workspace_guide",
    {
      description:
        "Read this before using project instances or SSH. Explains repository paths and the required OpenCode CLI workflow for changes inside VibeOnGo.",
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({ content: [{ type: "text", text: WORKSPACE_GUIDE }] }),
  );

  server.registerResource(
    "workspace-guide",
    WORKSPACE_GUIDE_URI,
    {
      description:
        "VibeOnGo instance layout, SSH access, and OpenCode workflow.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: WORKSPACE_GUIDE_URI,
          mimeType: "text/markdown",
          text: WORKSPACE_GUIDE,
        },
      ],
    }),
  );
}
