# OpenCode 2.0.16 → 2.0.18 integration report

**Reviewed:** 2026-09-28  
**Scope:** Vibeongo web app, `@repo/api-hooks`, `@repo/api-client`, and the OpenCode server launched by the Go runtime.  
**Upstream baseline:** OpenCode repository release commits [`ac2426e103` (2.0.16)](https://github.com/anomalyco/opencode/commit/ac2426e103) through [`39021dfd67` (2.0.18)](https://github.com/anomalyco/opencode/commit/39021dfd67). [Full source comparison](https://github.com/anomalyco/opencode/compare/ac2426e103...39021dfd67).

## Executive assessment

**No required client API migration was found for Vibeongo's existing calls.** The generated Promise client changes between these release commits are additive: `server.pair`, `server.connect`, their response types, and an optional `signal` on shell information. Existing endpoints and the root `OpenCode.make` entry point used by Vibeongo are unchanged. This is a source-level compatibility assessment, not a completed runtime upgrade test.

The highest value 2.0.18 fix for this integration is recovery of old compaction checkpoints containing image or file media. The most significant 2.0.17 change is one-time server pairing, but Vibeongo currently authenticates with its server password and that path remains accepted. Vibeongo's own OAuth tab openers need their own URL validation if it wants the 2.0.18 browser hardening.

## Current Vibeongo integration

| Area | Current behavior | Upgrade implication |
| --- | --- | --- |
| Dependency | [`platform/apps/web-app/package.json`](platform/apps/web-app/package.json) and [`platform/packages/api-client/package.json`](platform/packages/api-client/package.json) specify `@opencode/client: ^2.0.16`; [`platform/pnpm-lock.yaml`](platform/pnpm-lock.yaml) resolves both to 2.0.16, plus 2.0.16 protocol/schema. `api-hooks` depends on `api-client`, not directly on OpenCode. | Change both direct dependency declarations and regenerate the lockfile together for a reproducible 2.0.18 client upgrade. The caret permits a future 2.x install, but the committed lockfile currently pins 2.0.16. |
| HTTP client | [`opencode-services.ts`](platform/packages/api-client/src/services/opencode-services.ts) owns the sole `@opencode/client` import and calls session, message, permission, VCS, provider/model/agent, integration/OAuth, file, web search, and MCP endpoints. It normalizes raw protocol data into local [`opencode-types.ts`](platform/packages/api-client/src/services/opencode-types.ts). | No called endpoint or input shape changed in the generated 2.0.16→2.0.18 Promise client diff. `api-hooks` and the web app consume the normalized layer. |
| Server authentication | [`opencodewebstore.go`](core/internal/vibeongo/store/opencodewebstore.go) launches `opencode serve` with `OPENCODE_SERVER_PASSWORD`; [`opencode-services.ts`](platform/packages/api-client/src/services/opencode-services.ts) sends Basic `opencode:<password>`, and the Go health probe does likewise. | 2.0.17 adds signed pairing sessions but still accepts the configured password. Existing API access should continue. |
| OpenCode Web launch | [`runtime-tool-card.tsx`](platform/apps/web-app/components/runtime-tool-card.tsx) opens the OpenCode URL and offers a copy-password action. | One-time connect links are optional UX work, not required for Vibeongo's API client. |
| Streaming and transcript | [`opencode-services.ts`](platform/packages/api-client/src/services/opencode-services.ts) handles session events, pending inbox, shell events, and message pagination; [`playground-store-sync.tsx`](platform/apps/web-app/components/playground-store-sync.tsx) syncs them into the web app. | The release introduces no required event schema migration. Improvements to LLM delta order and compaction happen on the server side. |

## Changes by release and effect on this project

### 2.0.17

| Change | Source-level detail | Vibeongo effect |
| --- | --- | --- |
| One-time pairing | Adds authenticated `POST /api/pair` and single-use `GET /auth/connect/:code`. Codes expire after five minutes. A browser redeeming a code receives an HTTP-only session cookie; an API client receives a token that can be used as the Basic password. Existing password authentication remains in [`server auth`](https://github.com/anomalyco/opencode/commit/eccf0b3b7b) and the [official app pairing change](https://github.com/anomalyco/opencode/commit/2caba90a9a). | **Optional integration.** Could replace the copy-password OpenCode Web flow with a short-lived link. It would require a protected Vibeongo endpoint/action to request a code and a UI flow; simply updating `@opencode/client` will not change the current UI. |
| Browser API 401 behavior | Browser `fetch` failures no longer carry a Basic challenge; page navigation and non-browser clients still do. JSON unauthorized responses are returned during server startup as well. | Existing `Authorization` header calls should work. If credentials are missing or wrong, Vibeongo's error handling receives a JSON 401 without triggering the browser's native password dialog. Test this when upgrading the runtime binary. |
| Shell signal | Shell information gains optional `signal` when a command is killed by a signal. [Upstream change](https://github.com/anomalyco/opencode/commit/e22c1622e0). | No parser break. Vibeongo currently reduces shell completion to status, exit code, and a generic failure message; it could show the signal for clearer diagnostics. |
| Transcript and execution | Upstream adds TUI transcript verbosity and queued-prompt undo; fixes ordering of batched LLM text/reasoning deltas before the next block, thinking budgets, several media routes, and Console-hosted MCP registration. [Delta ordering change](https://github.com/anomalyco/opencode/commit/32d3535f66), [hosted MCP change](https://github.com/anomalyco/opencode/commit/6cd938e1e9). | TUI-only controls do not appear in Vibeongo automatically. Server-side event ordering and model fixes can improve Vibeongo sessions after the runtime binary is upgraded. Console-hosted MCP entries may appear through the existing `mcp.list` UI for accounts using that feature; no schema change was found in the generated client. |

### 2.0.18

| Change | Source-level detail | Vibeongo effect |
| --- | --- | --- |
| Browser opener hardening | The shared OpenCode opener refuses URLs without HTTP(S), covering TUI/CLI/MCP OAuth launches. [Upstream change](https://github.com/anomalyco/opencode/commit/29ce49db0f). | This does **not** cover Vibeongo's own `window.open` calls for [MCP OAuth](platform/apps/web-app/components/chat/opencode-mcp-menu.tsx) and [provider OAuth](platform/apps/web-app/components/chat/opencode-provider-connect-dialog.tsx). Validate the returned URL's protocol as `http:` or `https:` before opening it if adopting the same protection. Remote MCP *configuration* URLs are already checked in `opencode-services.ts`; authorization URLs are separate. |
| Legacy compaction media | Upgrades old media parts stored directly as `mediaType`/`data` into the newer nested media shape before validating a checkpoint. The upstream comment dates the legacy format to before 2.0.15. [Upstream fix](https://github.com/anomalyco/opencode/commit/041885d838). | Relevant to older OpenCode sessions with image/file attachments and compaction checkpoints. Server binary upgrade supplies the fix; changing the JS client alone does not. |
| Generated client | No further Promise client contract change beyond the 2.0.17 pairing endpoints and optional shell signal. | No required changes in `api-hooks`, `api-client`, or web app call sites. |

## Official `packages/app` changes Vibeongo will not inherit automatically

The sibling OpenCode checkout's `packages/app` is its own Solid UI; Vibeongo's web app is a separate React UI. Between these release commits, the official app gained [provider account switching](https://github.com/anomalyco/opencode/commit/684721efb8) in settings, [undo of queued prompts back into the composer](https://github.com/anomalyco/opencode/commit/beeb14e910), and [clearer nested-session paths/tabs](https://github.com/anomalyco/opencode/commit/ad53e39d2e). It also replaced password-based app pairing with one-time links. These are optional feature-parity projects for Vibeongo, not SDK breaks. In particular, queued-prompt undo calls the existing inbox cancel API and reconstructs a draft in app code; upgrading the client package alone cannot add that interaction.

## Breaking-change verdict

1. **No removed or changed generated Promise client method** in the examined 2.0.16→2.0.18 release range. Existing Vibeongo calls should compile against 2.0.18.
2. **No forced auth migration.** The OpenCode server continues to accept the configured Basic password. One-time pairing is additive. The 401 response behavior is observably different for browser requests, so verify the web app's expired or missing credential state.
3. **No automatic runtime upgrade.** Vibeongo's Go service executes the OpenCode binary preinstalled in its image. The repository does not pin that binary's version in this integration path. A JS dependency upgrade alone will not deliver server-side fixes, and an image upgrade alone will leave the committed client at 2.0.16.
4. **Vibeongo's own authorization URL opens remain outside upstream hardening.** This is an existing local gap highlighted by the new upstream change, not a new break introduced by 2.0.18.

## Recommended upgrade sequence and checks

1. Update both direct `@opencode/client` declarations to 2.0.18, regenerate `platform/pnpm-lock.yaml`, and run `api-client` and web app TypeScript checks. `api-hooks` needs no direct dependency edit.
2. Record and upgrade the OpenCode binary in the runtime image to 2.0.18. Confirm `opencode --version` inside that image; the repository currently treats the binary as preinstalled.
3. Smoke test one server against Vibeongo: authenticated health/status, list/create session, send prompt and receive SSE events, queued input, model inventory, MCP list/OAuth, and OpenCode Web sign-in. Include a wrong-password request to verify JSON 401 handling.
4. If historical sessions exist, open one with a pre-2.0.15 image/file compaction checkpoint to verify the 2.0.18 recovery fix. This is conditional on having such a fixture.
5. Add HTTP(S) validation at both Vibeongo OAuth `window.open` call sites. Consider one-time OpenCode Web pairing as a separate UX change if avoiding password copy is desired.

## Scope note on the pasted 1.18.33 notes

OpenCode **v1.18.33 is a separate release line** from the 2.0.16→2.0.18 source range reviewed here. Its GPT-6 sign-in, Cloudflare AI Gateway, Gemini/Gemma, debug-config, Console, and data changes should not be presumed present in 2.0.18 based on the v1 changelog. The directly relevant v2.0.18 URL and compaction changes were verified against the v2 release commits above.
