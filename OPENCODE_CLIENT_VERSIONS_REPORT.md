# OpenCode client 2.0.22 → 2.0.24 integration report

**Reviewed:** 2026-10-08

**Latest stable npm release at review:** `@opencode/client 2.0.24`

**Scope:** shared API client, API hooks, web app, and inherited mobile integration.

## Release and reference

The npm `latest` tag was queried directly; it resolves to **2.0.24**. The separate `beta`, `dev`, and `reserved` tags were not selected.

References:

- [Published client 2.0.24 metadata](https://registry.npmjs.org/@opencode/client/2.0.24), [protocol metadata](https://registry.npmjs.org/@opencode/protocol/2.0.24), and [schema metadata](https://registry.npmjs.org/@opencode/schema/2.0.24).
- [Official 2.0.23 release](https://github.com/anomalyco/opencode/releases/tag/v2.0.23), [2.0.24 release](https://github.com/anomalyco/opencode/releases/tag/v2.0.24), and [release comparison](https://github.com/anomalyco/opencode/compare/v2.0.22...v2.0.24).
- The supplied source is actually at `/home/jashan/Dev/opensource/opencode/packages/app` (plural `packages`). That checkout's HEAD was `93afa91904`, which includes work after the published release. Released behavior was inspected using the local release version-sync commits `d259ae7163` (2.0.22) and `bd55d4895f` (2.0.24); these are not the GitHub release tag commits. Published 2.0.22 and 2.0.24 declaration files were also compared directly, so later checkout changes were not treated as released APIs.

## What changed

| Area | Implementation |
| --- | --- |
| Dependencies | Both `platform/packages/api-client/package.json` and `platform/apps/web-app/package.json` now request `@opencode/client ^2.0.24`. |
| Lockfile | Client, protocol, and schema resolve to 2.0.24. Unrelated transitive updates introduced by dependency resolution were excluded; a frozen offline installation accepted the resulting lockfile. |
| Git initialization | Added `initializeOpencodeGit` and `useInitializeOpencodeGit`, using the native `client.vcs.init` API. |
| Review surfaces | Existing chat Git sidebar, new-chat Git sidebar, and full review page show an **Initialize Git** action when the selected workspace has no VCS repository. |
| Missing folders | Shared errors recognize the published `_tag`, with a dedicated missing-workspace title. Session/review queries stop retrying a typed `LocationNotFoundError`. |
| Undo and prompt submission | Shared prompt submission now follows the official staged-revert ordering, preserving the selected model when continuing after an undo. Queued prompts settle a staged revert without switching the active turn's model or agent. |

`api-hooks` and mobile consume the SDK through `api-client`; they do not need duplicate direct SDK dependencies. The web app retains its existing direct dependency because it already imports SDK types.

## Git initialization: official API and panel behavior

Official reference: [Git initialization implementation](https://github.com/anomalyco/opencode/commit/41516c78c8) and `packages/gui-extensions/src/review/model.ts` at the 2.0.24 version-sync commit.

The shared helper sends:

```ts
await client.vcs.init({ location: { directory }, provider: "git" });
```

This is `POST /api/vcs/init`, with `location` and `provider` encoded by the generated client. No shell command, manual `.git` creation, or automatic initialization is used.

The review panel resolves the selected directory's project before offering initialization. A confirmed project with no VCS displays the action; loading and lookup failures have separate states. A Git repository or another VCS provider does not receive the button. The action is disabled while initializing, and server errors remain visible with an opportunity to retry.

The mutation refreshes queries belonging to the captured server/workspace: repository detection, directory-scoped queries, and session data for that project session. It waits for cache invalidation before leaving the pending state. This follows the official approach of refreshing project, session, and location information after initialization. A user switching chats does not redirect the completed request's refresh to the new chat.

Repository lookup is enabled only while a sidebar is active; mounted hidden panels retain their state without starting this lookup. The existing Refresh button also refreshes repository detection, which allows recovery after a folder is restored or Git is initialized externally.

The shared web panel serves desktop and mobile browser layouts. The native Expo Review screen does not gain an initialization button in this update; the new API helper/hook is available to it.

## Missing workspace folders

Official reference: [missing-location handling](https://github.com/anomalyco/opencode/commit/4fb800734d) and `packages/app/src/workspaces/location.tsx` at the released version-sync commit.

The upgraded client declares `LocationNotFoundError` for location-dependent requests. We export its generated guard as `isOpencodeLocationNotFoundError` through the shared API client and use it in session, repository lookup, working-change, and last-turn-change queries.

Only this typed error suppresses retries. Other failures keep bounded retries; a generic network error or ordinary 404 is not interpreted as proof that a workspace disappeared. Error normalization now checks `_tag` before legacy `type` and `name`, and labels this case **Workspace folder not found**. It also recognizes `VcsInitNotSupportedError`. Existing message redaction remains in place.

This adopts the official error distinction and retry behavior. It does not copy the official missing-folder relocation prompt or add a new folder-recreation workflow.

## Continue after undo: preserve model selection

Official reference: [commit staged revert before switching selection](https://github.com/anomalyco/opencode/commit/19f8610c0a).

Previously, Vibeongo switched the model, then the agent, and submitted the prompt. OpenCode can commit a staged revert during admission, deleting timeline records from the revert boundary onward, including the newly recorded model switch.

The shared `sendOpencodePrompt` now performs:

1. Prepare attachments and file references.
2. Apply the chosen agent.
3. Commit an existing staged revert.
4. Apply the chosen model and variant.
5. Admit the prompt.

`queueOpencodePrompt` also commits an existing staged revert before admission. It continues to record the intended selection in metadata without changing the running turn's selection. Failures are awaited and stop admission rather than silently continuing.

Both web and native mobile use these shared functions. This is the official prompt-submission fix; command and shell flows retain their existing behavior. The earlier undo controls, per-answer fork, streaming completion grouping, and queued-message presentation remain intact.

## Other published changes and their availability

| Published addition/change | Handling in this upgrade |
| --- | --- |
| `vcs.init` and `VcsInitNotSupportedError` | Used by the new shared helper/hook and web review action. The API supports provider selection; our action deliberately selects Git. |
| `LocationNotFoundError` and declared location-related 404 responses | Included by the generated client and used for error classification/retry behavior. |
| Optional `ServerInfo.capabilities.persistentPty` | Available in SDK types. Vibeongo terminals use the existing runtime socket service; they are not switched to OpenCode persistent PTY handoff. Older servers can omit the capability. |
| `WorktreeError._tag` | Included by upgraded generated types; shared normalization recognizes tagged errors. Existing worktree operations continue to use the SDK. |
| Removal of unused legacy question schema definitions | No migration needed: our existing compatibility question view types remain local and current forms still use the v2 API. |
| Background-service startup/shutdown/protocol mismatch fixes | Included in the SDK's service modules. Vibeongo connects to an existing remote server through `OpenCode.make`; it does not use the desktop service launcher, so those fixes are not claimed as changes to our runtime lifecycle. |
| Official queue/steer, running-work headers, `/btw` tabs, and extension panel refinements | Reviewed as upstream UI changes. They are not new SDK methods automatically rendered in Vibeongo. Existing queue, sidebar, and native subagent viewing behavior is retained. |
| Provider OAuth labels and server/provider fixes | Supplied by the matching runtime and its inventory, not implemented locally by upgrading an npm dependency. |

The Promise client remains the integration entry point. There is no migration to SolidJS, an Effect UI, or upstream desktop extension hosting.

## Checks performed

The following checks completed successfully after the changes:

- Shared API client TypeScript compilation: `pnpm --filter @repo/api-client exec tsc -p tsconfig.json`.
- Shared API hooks TypeScript compilation: `pnpm --filter @repo/api-hooks exec tsc -p tsconfig.json`.
- Web app and native mobile app: `pnpm exec tsc --noEmit` in each application.
- Targeted ESLint for the review panel, session chat, new-chat workspace, and full review page: no errors or warnings.
- `pnpm install --frozen-lockfile --offline --ignore-scripts`: successful with the final lockfile.
- `git diff --check`: successful.

Automated tests, live browser interactions, and execution against a deployed 2.0.24 server were not run. Previous report test results are historical and are not evidence for this upgrade.

## Runtime and compatibility limits

This upgrade changes the TypeScript packages, not the OpenCode executable launched by `core/internal/vibeongo/store/opencodewebstore.go`. The deployed executable version was not verified or changed. Use a 2.0.24 runtime to obtain the matching Git initialization endpoint and server fixes; an older runtime may reject the new action, in which case the panel displays the request error.

The SDK's optional Effect peer still requests `4.0.0-rc.112`, while the workspace consumer resolves `4.0.0-rc.117`. Installation reports this existing mismatch; this update does not alter the workspace's Effect version. The schema/protocol retain their own declared Effect dependency. Other existing workspace peer warnings concern the legacy web resolver and React Native Metro configuration.

Recommended release follow-up: verify the deployed executable version, initialize Git in a disposable markerless workspace, recover after restoring a missing folder, and continue after undo with a different model. Confirm prompting, streaming, review, and mobile queue behavior against that runtime before rollout.

## Previous integrations retained

The earlier 2.0.18 → 2.0.20 and 2.0.20 → 2.0.22 integrations supplied provider `needs_auth` handling, optional form cancellation feedback, and persisted working/last-turn review modes. They remain in the code.

Manual subtask creation and parent-linked creation options remain removed, as requested. Existing child sessions and native subagent results remain readable. React Scan remains removed. This report replaces obsolete claims about parent creation and previously run tests with the current implementation and checks.
