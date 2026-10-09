# Backend email verification and password reset plan

## Scope

Implement email OTP verification for password signup and OTP-based password recovery in `platform/apps/server`. No frontend, mobile screen, API client, or API hook changes in this task. This file is a plan only; do not change application code, environment files, or generate/apply migrations until implementation is requested.

Reuse the existing `users.email_verified_at`, Argon2id password helpers, authentication middleware, and AWS SES sender. AWS SES sends email; SQS is not needed for this flow.

## Required behavior

- Signup creates an unverified user and sends an OTP. It must not issue a web session cookie or a mobile login token.
- Both web and mobile password sign-in require a verified email. After verification, the user signs in through the existing sign-in route.
- Existing sessions and bearer tokens for unverified password users must also be denied access. Otherwise, blocking new sign-ins would still let existing users bypass verification.
- Keep GitHub login working with the existing trusted GitHub email verification flow. Do not turn password recovery into a way to re-enable revoked password credentials or switch a GitHub-primary account back to password login.
- Accept syntactically valid email addresses; do not limit users to particular email domains. Verification proves mailbox access.
- Keep the existing password rule: 8–20 characters, no whitespace, no required uppercase letters or symbols. Store only Argon2id hashes.

## Routes and controller

Add `controllers/user/email-auth-controller.ts` and register the new routes in `routes/user-routes.ts`. Adapt signup in the existing `UserController` to return a verification-required response instead of a login response.

All paths below are relative to `/api/v1/users`:

| Route | Request | Result |
| --- | --- | --- |
| `POST /signup` and `POST /mobile/signup` | `{ firstName, email, password }` | Create or resume an eligible unverified signup, send an OTP, return `202` with `{ verificationRequired: true, challengeId, expiresInSeconds, resendAfterSeconds }`. No auth cookie/token and no user profile. |
| `POST /verify-email` | `{ email, challengeId, otp }` | Consume the signup OTP, apply its staged credentials, set `email_verified_at`, return `200` with a confirmation. Do not automatically log in. |
| `POST /resend-verification` | `{ email, challengeId }` | Resend for that eligible signup challenge after cooldown; return `202` with replacement challenge metadata. Preserve its staged password/name. |
| `POST /forgot-password` | `{ email }` | For an eligible verified password account, send a reset OTP. Always return the same `202` response shape for eligible, unknown, unverified, GitHub-primary, revoked, and disabled accounts. |
| `POST /reset-password` | `{ email, challengeId, otp, newPassword }` | Consume a valid reset OTP, replace the Argon2id password hash, invalidate old sessions/tokens, return `200`. Require normal sign-in afterward. |

Forgot-password responses should include an opaque `challengeId` even when no email is sent, so the response does not reveal account eligibility. Use generic invalid/expired OTP errors. A correct password on an unverified account may return `403` with a stable `EMAIL_NOT_VERIFIED` code and direct the caller to resend verification; an incorrect password retains the generic `401` login error.

Use shared email normalization and validation, strict six-digit string OTP validation (preserve leading zeros), bounded challenge IDs, and the current password/name validation. Return `Cache-Control: no-store`. Apply the existing trusted-origin rules for web requests and native-compatible origin checks for shared/mobile routes. Add dedicated send/verify/reset rate limits rather than sharing all action counters.

## Repeat signup for an unverified email

1. Match email case-insensitively. Lock the existing user before deciding whether signup can resume.
2. Only resume an active, unverified, email/password-primary account with non-revoked password credentials. Verified, GitHub-primary, banned, deleted, or revoked accounts must not be modified.
3. Preserve the existing user ID, username, wallet, settings, and projects. Do not create duplicate rows.
4. Hash the submitted password and stage that hash and submitted name on a new signup challenge. **Do not overwrite the account's effective password/name until that challenge is verified.** Knowing an email address alone must not allow someone to alter an existing account.
5. Bind verification to the returned `challengeId`, email/user, purpose, and staged password/name. A code from one signup attempt must never activate another attempt's password.
6. Enforce a 60-second send cooldown across the email/account, including repeat signup. During cooldown, return `429` with `Retry-After`, preserving the previous challenge and staged credentials. Do not silently accept an edited password without sending a matching OTP.
7. Once a new OTP is issued, invalidate the previous signup challenge. Resend retains the selected staged credentials, rotates the OTP/challenge ID, and invalidates the old code.
8. If the user changes their email, treat it as a separate signup; never change an existing user's email through this unauthenticated route.

This also gives existing unverified password users a recovery path: repeat signup with their desired name/password and verify the new challenge.

## OTP storage and service

Add a database schema for email authentication challenges and export it from `@repo/db`. Suggested fields:

- Random UUID `id`, `user_id`, purpose (`signup_verification` or `password_reset`).
- Normalized email snapshot and a keyed OTP digest.
- Optional staged password hash and name for signup verification.
- `created_at`, `expires_at`, `attempt_count`, `consumed_at`, and delivery status (`pending`, `sent`, `failed`).
- Indexes for user/purpose and expiry; enforce one current challenge per user/purpose through locked issuance and invalidation.

Use cryptographically random six-digit codes (`crypto.randomInt`), a 10-minute lifetime, and at most five failed verification attempts per challenge. Store an HMAC-SHA-256 digest keyed by a dedicated server secret, including challenge ID and purpose in the digest input. An ordinary unsalted hash of a six-digit code is too easy to enumerate after a database leak. Compare digests in constant time. Never return or log OTPs or staged hashes.

Create `services/auth/email-otp.ts` for issuance, cooldown checks, verification, and consumption. Create a password recovery service for eligibility and reset handling. Lock user then challenge rows in a consistent order. Verification and its user/credential updates must commit together; failed-attempt increments must persist even when the HTTP result is an error. Serialize concurrent verification, resend, repeat signup, reset, and GitHub linking so a code can succeed only once and account restrictions are rechecked under lock.

Rate-limit sends and verification by both IP and normalized-email digest, with fail-closed behavior if the limiter is unavailable. Keep an account/email attempt budget across resends so code rotation cannot bypass brute-force limits. Remove expired/consumed challenges on a scheduled cleanup after a short retention period; discard staged credentials when a challenge is consumed, replaced, or expires.

## AWS SES mail function and configuration

Extend `services/mail/send-mail.ts`, which already uses `@aws-sdk/client-ses`, rather than introducing a second sender. Use a configured region and sender identity. Add `sendAuthOtpEmail({ toAddress, otp, purpose })` for signup verification and password reset with separate subjects, plain-text and HTML bodies, expiry text, and an instruction to ignore an unsolicited request. Do not embed supplied passwords, names, or other unescaped input in email HTML.

Declare these values in `src/lib/env.ts` and append a clearly labeled configuration block at the end of the server `.env` when implementation is requested:

```dotenv
# Email verification and password recovery — replace placeholders before use
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=no-reply@example.com
EMAIL_OTP_HASH_SECRET=replace-with-a-cryptographically-random-secret-at-least-32-characters
# AWS_SES_ACCESS_KEY_ID=replace-with-your-ses-access-key-id
# AWS_SES_SECRET_KEY=replace-with-your-ses-secret-access-key
```

The two SES credentials already exist in `env.ts`; preserve any configured values in `.env`. Add actual placeholder assignments only when those keys are absent, avoiding duplicate assignments that override working credentials. Validate nonempty region/credentials, sender email format, and minimum OTP secret length. Reject known placeholder configuration when attempting to send; do not silently report delivery success.

Persist the pending challenge before sending, perform the SES network request outside the database transaction, and mark that exact challenge sent afterward. Only sent, current challenges can be verified. On delivery failure, invalidate that code while retaining its staged credentials until expiry for a fresh resend; leave the account unverified and allow a later retry. Cleanup must target the challenge ID so an old failure cannot erase a newer challenge. Return a sanitized delivery error for signup/resend. For forgot-password, preserve the generic response to avoid revealing eligible accounts, while recording a sanitized operational failure without email, OTP, or provider request payloads.

Use finite SES request timeouts/retries. Verify the sender identity in the configured AWS region, grant the IAM identity `ses:SendEmail`, and obtain production access to send to arbitrary recipients. SES sandbox accounts can send only to verified recipients or the mailbox simulator. See [AWS SES SendEmail requirements](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html).

## Password reset and session invalidation

Only issue/accept reset challenges for active, verified, email/password-primary accounts with an existing non-revoked credential. Recheck these conditions during consumption. Signup OTPs cannot reset a password; reset OTPs cannot verify signup. A reset must not restore revoked credentials or bypass a later GitHub connection.

On successful reset, atomically consume the challenge, update the Argon2id hash, revoke all web sessions, and invalidate all outstanding authentication challenges. Add a user authentication version counter and include/check it in issued JWTs so existing mobile and legacy JWT cookies are invalidated too. Update every JWT issuer, including GitHub/token exchange, consistently. Legacy JWTs without a version may map to version zero only while the user's stored version is zero; after a reset they must fail. Keep normal OAuth and API-key behavior explicit: this reset revokes login sessions, not separately managed API keys.

Enforce verified-email access for password accounts in the authorization middleware as well as sign-in. GitHub-primary accounts should continue to use the existing verified provider checks; audit all GitHub creation/link paths to ensure email verification is recorded before introducing any broader verification gate.

## Validation and rollout

Add isolated backend tests with mocked SES and rate limiter; never send real email in tests. Cover:

- Signup sends an OTP and creates no cookie, JWT, session, or login log; unverified sign-in and existing unverified sessions are denied.
- Correct verification, wrong OTP, expiry, exhausted attempts, replay, purpose/email/challenge mismatch, and concurrent consumption.
- Repeat signup preserves identity and related data, stages changed credentials, rejects old OTPs, observes cooldown, and cannot alter verified/GitHub/disabled accounts.
- Resend rotates the code, preserves staged credentials, retains the account attempt budget, and handles SES failure without deleting newer challenges.
- Forgot-password has indistinguishable responses for ineligible/unknown accounts. Reset changes the password only after a valid OTP and cannot re-enable revoked credentials.
- Reset invalidates web sessions and old JWTs; a fresh sign-in works, and concurrent reset/GitHub linking cannot bypass restrictions.
- Invalid payloads, rate limits, unavailable dependencies, rollback, case-insensitive duplicate signup, and sanitized errors.

Run backend TypeScript checks and the auth integration suite. Database schema changes require a migration before deployment; generation/application remains a separate explicitly requested step. Document the intentionally changed signup contract for later web/mobile/client work: callers must show OTP verification instead of assuming signup logs the user in. Until those clients are updated, email signup cannot complete through their old screens. Configure SES and the OTP secret before enabling the backend flow.

## Implementation notes

Backend implementation adds the four shared OTP routes above and changes both signup endpoints to HTTP 202 with `data.verificationRequired` and challenge metadata. Verification returns a confirmation without logging in. Sign-in returns `403` with `code: "EMAIL_NOT_VERIFIED"` only after a valid password for an unverified account.

The local `.env` and committed `.env.example` include configuration placeholders without overwriting existing SES credentials. New sender/OTP-secret settings are optional at process startup to keep unrelated backend features available during configuration; authentication email operations fail closed until usable values are supplied. No real emails were sent during automated validation.

Before deploying, generate/apply the database migration for `email_auth_challenges` and `users.auth_version`, configure the sender identity and OTP secret, and update clients to handle the new signup/verification contract. Migration generation and frontend/client changes are not included here. Existing GitHub JWTs without a version continue to work at version zero; password verification/reset advances the version and invalidates older tokens. New WebSocket connections enforce the same user verification/version checks; this does not forcibly disconnect already established connections.

### Queued mail delivery

OTP delivery now uses the BullMQ `mail` queue and `jobs/mail-worker.ts`, registered in the existing cron-worker entrypoint. Requests return after queue acceptance; the worker marks a challenge sent after SES success. Job payloads contain the challenge ID and an authenticated encrypted OTP, with no plaintext code or recipient. Transient failures retry three times in total; final failures invalidate only the affected challenge. See `src/jobs/mail.md` for process commands, configuration, retry behavior, and delivery guarantees.
