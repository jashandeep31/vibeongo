# OpenCode 2.0.20 → 2.0.22 integration report

**Reviewed:** 2026-10-02

**Scope:** `platform/packages/api-client`, `platform/packages/api-hooks`, `platform/apps/web-app`, `platform/apps/mobile-app` session chats/review, and the workspace lockfile.

**Baseline:** Published npm `@opencode/client`, `@opencode/protocol`, and `@opencode/schema` packages at 2.0.20 and 2.0.22, with declaration files compared directly. Upstream commits and release tags were also checked.

**Sources:** [v2.0.21](https://github.com/anomalyco/opencode/releases/tag/v2.0.21), [v2.0.22](https://github.com/anomalyco/opencode/releases/tag/v2.0.22), [combined comparison](https://github.com/anomalyco/opencode/compare/v2.0.20...v2.0.22), [published client metadata](https://registry.npmjs.org/@opencode/client/2.0.22).

**Previous upgrade:** 2.0.18 → 2.0.20, reviewed 2026-09-30; the `needs_auth` connection fix remains in place.

## Status

**Client upgraded to 2.0.22.** Both direct dependencies now declare `@opencode/client ^2.0.22`; `platform/pnpm-lock.yaml` resolves client, protocol, and schema to 2.0.22. `api-hooks` consumes the client through `api-client` and needs no direct OpenCode dependency.

**Implemented:** Cancellation feedback through the client, hooks, and question UI; parent-linked session creation through the client and start-session hook; a persisted Last turn changes mode in web review; explicit bold styling for rendered markdown.

**Validated:** `api-client` and `api-hooks` compile, web-app passes `tsc --noEmit`, and five mocked HTTP upgrade contract checks pass. Targeted ESLint has no errors; the session chat component has an existing `useMemo` dependency warning unrelated to this upgrade. There has been no live browser or runtime smoke test against a 2.0.22 server.

**Runtime binary is separate.** This change updates the three requested TypeScript areas, not the OpenCode executable in deployed workspaces. Server/provider improvements require a 2.0.22 runtime. The local `opencode --version` command invokes a mise shim whose installation fails in the restricted environment, so its installed version was not verified.

## Published contract changes

The existing Promise client methods remain available. The changes below are additive or relax configuration requirements. The `effect` peer remains `4.0.0-rc.112`; the workspace still resolves `rc.117`, carrying the same existing peer warning.

| Contract | Change | Vibeongo handling |
| --- | --- | --- |
| `session.form.cancel` | Optional `message` query parameter; cancelled form state also exposes optional `message`. | `rejectOpencodeQuestion` uses the generated client, which encodes feedback in the URL query. It sends no DELETE body. The hook accepts either the existing request ID string or `{ requestId, message? }`, preserving mobile callers. Web questions expose optional dismissal feedback. |
| `session.create` | Optional `parentID`; a missing parent can return `SessionNotFoundError`. The server derives the child's location from its parent. | `createOpencodeSession` and `useStartOpencodeSession` create independent chats. Parent-linked creation and the manual subtask action have been removed; received `parentID` values remain available for existing child navigation. |
| Provider settings | Adds `headerTimeout?: number \| false`; `chunkTimeout` now also accepts `false`. | Included through the upgraded generated types. Vibeongo has no separate provider-settings editor to change. These inference timeouts are separate from the client's inventory request and SSE idle timeouts. |
| Config model capabilities | Config fields `tools`, `input`, and `output` become individually optional. Omitted fields inherit the base model. | Included through generated configuration types. Runtime model inventory remains normalized using the resolved model capabilities. |
| Plugin session APIs | Compaction/removal support and metadata update fixes. | Server/plugin behavior; Vibeongo uses the HTTP client rather than the plugin session API. |

## Web review changes

The review page now offers **Working changes** and **Last turn changes** and saves the selected mode per session in local storage. Working changes keeps the existing VCS behavior. Last turn changes uses `session.diff({ sessionID })` through a separate client helper and React Query hook; OpenCode defaults that endpoint to the newest user message's turn.

A turn includes prompts steered in while the session was busy and ends at the next idle marker. For an active step, the server can compare against the working copy. The review page refreshes the last-turn query when its cached session update timestamp changes and when the user presses Refresh. Snapshot errors are shown explicitly, and an initial fetch displays a loading state. A snapshot failure does not silently show the working diff under the Last turn label.

The existing session data/cache shape is unchanged; last-turn diffs use a separate query key. This preserves the working-change summaries used by other consumers. The selector is offered only after the session directory resolves to a Git project, matching the official review extension. Review queries also refresh on execution status changes, including the transition to idle, and last-turn diffs do not refetch on window focus.

## Upstream behavior relevant to Vibeongo

| Release area | Effect after the server upgrade |
| --- | --- |
| Azure discovery (2.0.22) | The existing model inventory reads discovered deployments. Catalog limits/costs/capabilities are resolved upstream. |
| Inference HTTP timeouts (2.0.22) | Header/chunk timeouts default to five minutes; `false` disables either. Timeout retries are bounded upstream. No client timeout should be changed to emulate these provider settings. |
| Provider errors, overflow and streaming (2.0.21/22) | Better auth/quota/overflow classification and transport error messages flow through the existing error normalization. Anthropic content-filter explanations are generated upstream. |
| Prompt caching and gateway routing (2.0.21/22) | OpenRouter, Qwen/Alibaba, DigitalOcean and Cloudflare Gateway changes are inference-server behavior. Existing token normalization already carries cache read/write usage. |
| MCP diagnostics and session cleanup (2.0.22) | Improved server errors flow through existing MCP dialogs and tools. Legacy HTTP MCP cleanup happens upstream. |
| ACP defaults, live catalogs, forms, roots and compaction markers (2.0.21/22) | Vibeongo uses HTTP/SSE rather than ACP. Its existing question/web-search forms, compaction replay/live handling, and session model/agent handling remain applicable; no ACP adapter was added. |
| Desktop extension host (2.0.22) | An upstream desktop architecture change, not a new HTTP client requirement. Vibeongo's own terminal/review/file UI does not use that host. |
| CLI question continuation and upgrade locks (2.0.21/22) | CLI behavior. Vibeongo launches `opencode serve` and submits prompts through the HTTP API. |
| Browser element comments, session-ID links and read grouping (2.0.21) | Optional upstream UI features, not contract migrations. These were not ported in this upgrade. Vibeongo does not attach the upstream desktop browser. |

## Checks and remaining work

Contract regression checks are in [`opencode-upgrade.test.mjs`](platform/packages/api-client/tests/opencode-upgrade.test.mjs). Run `pnpm --filter @repo/api-client test:opencode-upgrade` from `platform`; this compiles the client and runs five tests against mocked HTTP responses. Checks cover query-encoded feedback/no DELETE body, omission of feedback and propagation of a server failure, the session snapshot endpoint, parent creation without overriding the parent location, and Git project detection at the requested session directory.

After upgrading a deployed runtime to 2.0.22:

1. Verify `opencode --version` inside that runtime, authenticated health, session creation, prompting/SSE, queues, model inventory and MCP operations.
2. Dismiss a question with feedback and verify the agent receives it and continues. Dismiss without feedback and check normal cancellation behavior.
3. Switch review modes after two turns with different edits, reload, and confirm the selected mode persists and the last-turn diff differs from working changes where expected. Test loading, error, mobile and refresh states.
4. Create a child with `parentID` through the client and confirm its directory matches its parent and a missing parent returns an error.

Carried-over integration items:

- The deployed runtime binary version is not pinned by this client upgrade.
- Provider and MCP OAuth `window.open` calls still need `http:`/`https:` URL validation before adding further uses of server-supplied links.
- `needs_auth` connections still correctly count as disconnected. A dedicated sign-in-required message/link remains an optional UI follow-up.
- Raw provider `response.body` is not rendered; displaying it requires sanitization/redaction. Existing normalized messages remain the user-visible errors.

## Mobile session chats (follow-up)

Mobile's question drawer now accepts optional dismissal feedback, including dismissal via Android Back. Feedback is passed through the same shared mutation and generated cancellation client as web. The existing request-ID-string callers remain compatible.

The mobile Review screen offers Working changes / Last turn changes with accessible selection controls. The choice is saved per session with the existing Expo SecureStore dependency on native platforms and local storage on mobile web. Storage reads do not overwrite a choice made while loading, and writes are serialized so fast switches preserve the latest choice. Last-turn review uses the shared snapshot hook, updates with session timestamps and manual refresh, and displays loading, error/retry, and mode-specific empty states. Switching modes clears the selected file.

Mobile already renders markdown `strong` text at weight 700. The shared `useStartOpencodeSession` hook creates independent chats; manual child-session creation has been removed. Mobile requires no direct `@opencode/client` dependency.

Validation: mobile TypeScript check passed. Native interaction and persistence still need device/simulator verification. Expo APIs were checked against the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) and [SecureStore documentation](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).

## Subtask creation removed

The manual subtask creation menu, dialog, delegation prompt builder, and parent-linked creation options in the shared API client and session hook have been removed. Session actions retain export and navigation to an existing parent chat. Existing native subagent results remain readable in the transcript.

## Official v2.0.22 implementation audit

**Rechecked:** 2026-10-02 against the exact [v2.0.22 source](https://github.com/anomalyco/opencode/tree/v2.0.22), release commit `527f0b9`, and the published 2.0.22 Promise client/schema/protocol. The local upstream checkout is not at that release, so it was not used as the definitive reference for this audit.

| Area | Official implementation | Audit result |
| --- | --- | --- |
| Cancellation feedback | `packages/protocol/src/groups/session.ts`: DELETE form cancellation accepts optional query `message`; `core/src/tool/plugin/question.ts` returns it as model feedback. | Shared client and both question UIs conform. The optional feedback input is Vibeongo UI. |
| Parent-linked creation | `packages/core/src/session.ts`: an existing parent's location supplies the child's location; a missing parent fails. | Shared create helper conforms and sends only `parentID` for children. This does not fork/copy history. |
| Last turn changes | `packages/gui-extensions/src/review/model.ts`: Git-only option, per-session preference, native `session.diff`, refresh on idle, no window-focus refresh. | Fixed web/mobile Git gating and preference scope in this audit. Both use the native endpoint and refresh on status/timestamp changes. Vibeongo also provides manual refresh. |
| Child composer | `packages/app/src/session/composer/session-composer-region.tsx`: child sessions cannot be prompted; offers parent navigation while form/permission controls remain usable. | Web and mobile conform. Mobile's shell selector now observes `parentID` changes as well. |
| Native subagent lifecycle | `packages/core/src/tool/plugin/subagent.ts` and `session/subagent-completion.ts`: foreground result returned through the tool; background result delivered synthetically to the parent. | Server owns execution/delivery. Web cards link to the child, track status, and expose tool output. Live/replayed completion labels are Vibeongo presentation. |
| Provider/config additions | Published schema adds `headerTimeout`, supports false timeouts, and optional partial model capabilities. | Upgraded dependencies include these types. Runtime implements Azure discovery, timeouts, caching, error handling and capability merging. They are not reimplemented by our UI. |
| Bold markdown | Official session markdown uses its bold font weight. | Web explicitly uses bold; mobile already uses 700. Styling systems differ. |

**Intentional differences / remaining gaps:**

- Mobile has the child input bar and parent navigation, but its existing subagent tool cards are not yet clickable child-navigation cards and do not load background outcomes like web. No mobile delegation dialog was added.
- Official review additionally supports branch changes and persists file/open-panel state. This update ports the requested working/last-turn choice, not that entire extension. Vibeongo's existing working-diff loader still falls back to session snapshots when VCS fetching fails on older/unavailable servers; that compatibility fallback is not official review behavior.
- Desktop extension hosting, embedded browser comments, grouped reads, transcript session-ID links, ACP additions and CLI updater changes were not ported. The release table above identifies the server-only behavior that the upgraded runtime supplies.

**Validation:** Five upgrade contract checks and five subagent regression checks passed; shared package compilation and web/mobile TypeScript checks passed. Targeted web ESLint has no errors and three existing warnings. Mobile has no ESLint flat config, so a mobile ESLint check could not run. Native/browser interaction and an actual 2.0.22 server/model execution have not been smoke-tested, and the deployed CLI version is still unverified.
