# OpenCode 2.0.18 → 2.0.20 integration report

**Reviewed:** 2026-09-30  
**Scope:** Vibeongo web app, `@repo/api-hooks`, `@repo/api-client`, and the OpenCode server launched by the Go runtime.  
**Upstream baseline:** published npm packages `@opencode/client`, `@opencode/protocol` and `@opencode/schema` at 2.0.18 and 2.0.20, diffed file by file. Release notes: v2.0.19 and v2.0.20 ([comparison](https://github.com/anomalyco/opencode/compare/v2.0.19...v2.0.20)).  
**Previous report:** 2.0.16 → 2.0.18 (2026-09-28). That upgrade was applied, and the lockfile pinned 2.0.18 before this change.

## Status

**Upgraded.** Both direct `@opencode/client` declarations are now `^2.0.20`, and `platform/pnpm-lock.yaml` resolves client, protocol and schema to 2.0.20. `tsc --noEmit` passes for `api-client`, `api-hooks` and `web-app`, and `api-client` builds. There has been no runtime smoke test against a 2.0.20 server binary yet.

**Contract changes are additive.** Nothing was removed from, or renamed in, the Promise client, protocol or schema packages. The only lines that differ in existing types are new optional fields. The `effect` peer is still `4.0.0-rc.112`. The workspace resolves `rc.117`, which is the same unmet-peer warning we already had on 2.0.18.

**One semantic fix was applied.** It is described under [Connection `needs_auth` status](#connection-needs_auth-status-fixed).

## Generated contract diff (2.0.18 → 2.0.20)

| Package | Change | Vibeongo effect |
| --- | --- | --- |
| `@opencode/client` (Promise) | Adds `credential.list()` → `CredentialEntry[]` and `credential.create(input)` → `CredentialEntry` (`GET`/`POST /api/credential`). `create` returns a conflict error if the ID already exists. With `activate: false` it does not replace the active credential. | Not used. `credential.list` returns **secret values**. If we ever call it, keep it server-side and never send its result to the browser. |
| `@opencode/schema` `Connection` | Adds `Connection.Status = { status: "needs_auth", message, url? }` as optional `status` on both `CredentialInfo` and `EnvInfo`. | **Needed a fix** (see below). |
| `@opencode/schema` `Session.StructuredError` | Adds optional `response: { body: string }`, which carries the provider's raw response body. It appears in session error events and in message errors. | Nothing breaks. `normalizeOpencodeError` ignores unknown fields. The server's improved `message` (it now parses AWS and RFC 9457 error bodies) comes through the existing `message` field automatically. |
| `@opencode/schema` `Credential` | Adds `Credential.Entry` and `Credential.CreateInput`. | None. |
| Client internals | Bundler chunk renames (`contract-*` → `shared-events-*`) and service/runtime internals. | None. We only import the root `OpenCode.make` entry point. |

## Connection `needs_auth` status (fixed)

Starting with 2.0.20, an integration whose OpenCode Console SSO has expired, whose session was revoked, or whose plugin reports a sign-in problem **keeps its connection entry**, and that entry is marked `status.status === "needs_auth"`.

Before this change, [`getOpencodeProviderIntegrations`](platform/packages/api-client/src/services/opencode-services.ts) set `connected: integration.connections.length > 0`. On a 2.0.20 server, the provider dialog ([`opencode-provider-connect-dialog.tsx`](platform/apps/web-app/components/chat/opencode-provider-connect-dialog.tsx)) would then show a ✓ for a provider that can't actually run inference.

**Fix:** `connected` now counts only connections that are **not** `needs_auth`. A provider in that state shows the existing reconnect chevron, and selecting it runs the normal connect flow. The UI did not change.

**Optional follow-up:** show a "Sign in required" marker with `status.message`, and open `status.url` when present, like the upstream TUI and App do. This would need new UI. It should validate the URL as `http:`/`https:` before calling `window.open` (see the open item below).

## Release notes relevant to Vibeongo

### 2.0.19 (server-side; no client contract change)

| Change | Vibeongo effect |
| --- | --- |
| Compaction rebuilt: a too-long request is retried at 70%, 50% and 35% of its size, then as trimmed text. The compaction buffer is 10% of the model limit, and max output tokens fit the remaining context. | Fewer `ContextOverflowError` session failures once the runtime binary is upgraded. The existing "Context limit exceeded" title still covers what is left. |
| Child sessions and forks send the parent's session and affinity headers. System prompt reordered for prompt-cache reuse. | Better cache reuse for subagents. No client work. |
| Shell tool env gains `AGENT=1`, `OPENCODE=1`, `AI_AGENT=opencode`, `OPENCODE_SESSION_ID`. | Scripts in Vibeongo workspaces can detect that an agent is running them. |
| Invalid Google API keys are reported as auth errors instead of being retried. Gemini parallel tool calls are fixed. | Better errors and behavior once the binary is upgraded. |
| `--session <unused-id>` creates the session. | CLI only. Vibeongo calls `session.create`. |

### 2.0.20

| Change | Vibeongo effect |
| --- | --- |
| Connection status / `needs_auth` (plugin API and OpenCode Console). | Handled in `api-client` (see above). |
| Provider errors show the provider's real explanation, and the raw body is attached as `response.body`. | Error messages improve automatically. We don't show `response.body` yet. Showing it would need redaction (reuse `sanitizeOpencodeErrorMessage`) and a UI decision. |
| Permission rejection with feedback applies to the whole batch of parallel asks, and the model continues. | Rejecting in Vibeongo's permission UI while several asks are pending no longer ends the step. Behavior change only; no code change. |
| "Sign in with ChatGPT" OAuth method (token sharing, PKCE). ChatGPT-plan models report zero cost. | The new method appears in `integration.list` as an ordinary `oauth` method, and our dialog already lists OAuth methods generically. Zero-cost models may show $0 in any cost display. |
| New credential endpoints. | Not used (see the contract diff above). |
| SQLite DB files are owner-only (0600). | Check that the user running `opencode serve` in the runtime image owns its data directory. |
| `opencode service set disabled true`, `auth export/import`, `opencode run` permission changes. | CLI only. Vibeongo launches `opencode serve` directly. |

## Current Vibeongo integration (unchanged)

| Area | Behavior |
| --- | --- |
| Dependency | `@opencode/client ^2.0.20` in [`web-app`](platform/apps/web-app/package.json) and [`api-client`](platform/packages/api-client/package.json). `api-hooks` depends on `api-client`, not directly on OpenCode. |
| HTTP client | [`opencode-services.ts`](platform/packages/api-client/src/services/opencode-services.ts) is the only file that imports `@opencode/client`. It normalizes responses into [`opencode-types.ts`](platform/packages/api-client/src/services/opencode-types.ts). |
| Server auth | [`opencodewebstore.go`](core/internal/vibeongo/store/opencodewebstore.go) launches `opencode serve` with `OPENCODE_SERVER_PASSWORD`. The client sends Basic `opencode:<password>`. This is unchanged in 2.0.19/2.0.20. |

## Still open (carried over from 2.0.18 review)

1. **Runtime binary version is not pinned.** A JS client bump doesn't deliver the 2.0.19 and 2.0.20 server fixes. Upgrade the OpenCode binary in the runtime image and confirm with `opencode --version`.
2. **OAuth `window.open` URL validation.** [MCP OAuth](platform/apps/web-app/components/chat/opencode-mcp-menu.tsx) and [provider OAuth](platform/apps/web-app/components/chat/opencode-provider-connect-dialog.tsx) still open server-provided URLs without checking for `http:`/`https:`. This also applies to any future use of `Connection.Status.url`.

## Recommended checks after the binary upgrade

1. Authenticated health, list/create session, prompt with SSE events, queued input, model inventory, MCP list/OAuth.
2. Provider dialog: a working provider shows ✓. A provider in `needs_auth` (for example an expired Console SSO) shows the chevron and reconnects.
3. Trigger a provider error (bad key) and confirm the session error shows the provider's own message.
4. Reject one of several parallel permission asks and confirm the session continues instead of failing.
