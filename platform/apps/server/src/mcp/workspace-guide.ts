import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

export const WORKSPACE_ROOT = "/home/vibe/workspace";
export const WORKSPACE_GUIDE_URI = "vibeongo://docs/workspace-guide";
export const WORKSPACE_REMINDER =
  "Use sandbox by default when runtime is omitted; do not ask the user to choose VM or sandbox. For all project changes, use the installed OpenCode CLI from the target repository by default. Read get_project_context for architecture and repository paths, and get_workspace_guide before operating on an instance. Repositories are normally under /home/vibe/workspace/<folder_name>; use SSH for navigation, inspection, and invoking OpenCode.";

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
saved overviews, providers, folder names, and expected workspace paths. It has
no session or instance data. Missing overviews stay empty; do not invent an
architecture or treat saved documentation as a live inspection of the code.

The standard Linux user is vibe, with home directory /home/vibe. Repositories
are cloned into /home/vibe/workspace/<folder_name>. The folder name is the last
segment of the repository full_name: company/frontend becomes
/home/vibe/workspace/frontend. A VibeOnGo project name is not a repository path.
get_projects returns configured repository names and expected workspace paths.
Confirm the directory exists before working; setup may still be in progress.
If the runtime user differs from the standard template, use its $HOME/workspace.

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
