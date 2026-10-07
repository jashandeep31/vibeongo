# Database-backed SSH access plan

## Goal and behavior

Replace the current 90-second, single-use Redis SSH ticket with a reusable SSH access token that expires 60 minutes after creation. A token belongs to one user, project session, and running instance. The same token can start multiple SSH connections until it expires or is revoked. Each successful gateway authentication still receives *fresh*, short-lived proxy and runtime WebSocket tokens; those WebSocket tokens are never stored in the SSH access table.

The database stores only the SHA-256 hash of a cryptographically random token. The plaintext token, SSH username, and full command can be returned **only by the create request**. Neither the list endpoint nor a page reload can recover them from the hash. The UI must state this clearly and offer **Create new** when a user no longer has the command. Do not show a Copy action on an existing token row.

The table definition already exists in `platform/packages/database/src/schemas/ssh-access-tokens.ts` and is exported by `@repo/db`. The schema has `id`, `token_hash`, `user_id`, `project_session_id`, `instance_id`, `created_at`, `expires_at`, `revoked_at`, and `last_used_at`, plus lookup indexes. **Generate and apply the database migration before deploying the server changes.** Migration generation is a separate task; it is not part of this plan's implementation until requested.

## 1. Server: create, list, and revoke

Add an SSH access controller under `platform/apps/server/src/controllers/project-sessions/` and routes in `project-session-routes.ts`:

| Route | Auth | Behavior |
| --- | --- | --- |
| `POST /api/v1/project-sessions/:id/ssh-access` | Signed-in user | Validate session ownership, project ownership, session not archived, and current running/unexpired instance. Generate 32 random bytes in base64url, store only the SHA-256 hex digest, set `expires_at` to now + 60 minutes, return the one-time plaintext connection details. |
| `GET /api/v1/project-sessions/:id/ssh-access` | Signed-in user | Validate session/project ownership. Return metadata for that user's tokens for this session, newest first. Never return `token_hash`, plaintext token, WebSocket tokens, or runtime secrets. |
| `POST /api/v1/project-sessions/:id/ssh-access/:accessId/revoke` | Signed-in user | Validate the token belongs to this user and session; set `revoked_at` once. Make repeat revocations harmless. Return updated metadata. |

The create response should be `{ id, username: <plaintext token>, host: SSH_GATEWAY_DOMAIN, port: SSH_GATEWAY_PORT, createdAt, expiresAt }`, with `Cache-Control: no-store`. The client constructs `ssh -p <port> <username>@<host>` using the existing `formatSshCommand` function (omit `-p` only for port 22). Avoid a separate `ticket` property if it only duplicates `username`. The list response should contain `{ id, createdAt, expiresAt, revokedAt, lastUsedAt, instanceId, status }` where status is derived as `active`, `expired`, `revoked`, or `instance_unavailable`. If exposing `lastUsedAt`, update it at most on successful SSH authentication, not on each byte of terminal traffic. Cap or paginate the list if it can grow.

For ownership checks, follow the existing `issueSshTicket` query in `ssh-ticket-controller.ts`, including user, project, session, instance state, and `terminates_at`. Revoke and list must still work when the instance is stopped or expired, so their ownership checks should not require a running instance. Restrict revoke updates by `id`, `user_id`, and `project_session_id` in the same query. Return a generic not-found result for another user's token.

## 2. Server: gateway validation and fresh terminal grant

Replace `POST /api/v1/internal/ssh-tickets/redeem` with `POST /api/v1/internal/ssh-access/authorize` in `internal-routes.ts`. Keep the gateway's existing shared `SSH_GATEWAY_TOKEN` authentication and constant-time comparison. Request body: `{ "token": "<SSH username>" }`. Validate the 43-character base64url format; hash it with SHA-256 and find the indexed `token_hash` row. Require `revoked_at IS NULL` and `expires_at > now()`, and check the linked instance is still running, not past `terminates_at`, still attached to the same non-archived session, and owned by the same user/project. Reject all failures without revealing whether a token exists. Do **not** delete or consume the row.

After authorization, call the existing `getSshTerminalWebSocketGrant()` service to obtain new proxy and runtime tokens for this individual connection. Preserve the grant response consumed by the Go bridge: `valid`, `websocketUrl`, `proxyToken`, `runtimeToken`, and grant `expiresAt`. Return `Cache-Control: no-store`. Update `last_used_at` after authorization; decide whether grant acquisition failure should leave it unchanged. Keep DB and runtime calls out of any transaction spanning network requests.

Expiration and revocation should deny **new SSH handshakes**. They should not forcibly close an already established terminal in this first version. The `expiresAt` in the gateway grant is for short-lived WebSocket connection setup; do not use it as the SSH session lifetime. An active connection ends only through normal disconnect, runtime termination, or an explicitly defined future forced-revocation feature.

## 3. Go SSH gateway

In `core/cmd/ssh-gateway/api.go`, point the API call to the new internal route and send `{ token }`. Rename `redeem`/ticket terminology to `authorize`/access token throughout `api.go`, `main.go`, logs, and `README.md`. Keep the token-as-SSH-username design, 43-character format check, shared server secret, HTTP timeout, grant parsing, terminal WebSocket bridge, and SSH/WebSocket keepalives. The gateway must request authorization on **every new SSH connection**, including reconnects with the same unexpired token. Do not cache an authorization result or proxy/runtime WebSocket token for the whole 60-minute lifetime.

Review `handleConnection` in `main.go`: it currently sets a deadline from `grant.ExpiresAt` during channel setup. Make sure this protects only connection setup and is cleared after the session starts, so expiry of a short-lived WebSocket grant cannot end a live SSH session. Update user-facing errors for expired/revoked access rather than “ticket already used.”

## 4. Shared client, hooks, and web app

Replace `platform/packages/api-client/src/services/ssh-ticket-services.ts` and `platform/packages/api-hooks/src/hooks/use-ssh-tickets.ts` with SSH access service and hooks for create, list, and revoke. Update package exports and API client binding. Use a distinct response type for the create call (contains `username`) and list items (metadata only). Invalidate the session's SSH access list after create and revoke. Keep `formatSshCommand`, changing its input type to a generic `{ username, host, port }` shape.

In `project-session-settings-page.tsx`, replace the 90-second single-use copy with a “Create SSH access” action and a list of created accesses showing creation time, expiry, last use if available, status, and Revoke for active rows. After creation, show the full command with Copy and a clear “copy it now; it cannot be shown again” message. Keep this command in component memory only; clear it on reload, when it expires, when its access is revoked, or when the selected session/instance changes. Do not put the plaintext in local storage, a persisted query cache, URLs, analytics, or error logs. Refresh the list after create/revoke and on reopening the page; update displayed expiry as time passes.

In `runtime-pulse-menu.tsx`, keep “Copy SSH command” as a **create-and-copy** shortcut, but make the label/feedback clear that it creates a new 60-minute access. It must also invalidate the list so settings shows the new row. Retain the direct VM SSH command separately; do not mix it with gateway access tokens.

## 5. Mobile app and retirement of Redis tickets

Keep the “SSH connection” entry in `project-workspace-actions-menu.tsx`. Change `project-ssh-connection-drawer.tsx` so opening it **lists existing access** instead of silently creating a new token. Show status, expiry, and Revoke for each access; provide an explicit “Create SSH access” button. Only the freshly created response shows the command plus individual Copy controls for username, host, and port. After closing/reopening the drawer, show metadata only. Use the 60-minute expiration time rather than the old 90-second countdown, and prevent copying after expiry or revocation. Handle no active instance, no tokens, loading, and failed create/revoke states.

Once all callers use the new routes, remove `platform/apps/server/src/cache/ssh-ticket-cache.ts` **completely**, along with imports, `TICKET_TTL_SECONDS`, `GETDEL`, old ticket controller/routes, old API client/hooks exports, and outdated 90-second/single-use UI text and gateway documentation. No Redis SSH ticket lookup or fallback path should remain. Redis/Valkey can still serve unrelated features; this change does not remove the general cache client.

Rollout order: apply the new table migration, deploy the server with the new access endpoints, deploy the Go gateway and web/mobile clients, then remove the old endpoints and Redis ticket code. Coordinate gateway and server rollout because changing the internal URL breaks old gateways. Until rollout is complete, either use a brief compatibility window with both routes or deploy both services together. Verify create → copy → connect → disconnect → reconnect with the same token, list without plaintext, revoke → denied reconnect, expiry → denied reconnect, and stopped/replaced instance → denied reconnect. Also verify an already established SSH session does not end merely because its 60-minute credential or its short-lived WebSocket setup grant expires.
