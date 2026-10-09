# Mail queue

Signup, verification resend, and forgot-password requests submit an encrypted OTP job to the BullMQ `mail` queue. The HTTP request waits for queue acceptance, not SES delivery. The challenge stays `pending` until the worker successfully sends the email; pending OTPs cannot be verified.

`mail.ts` produces jobs. `mail-worker.ts` consumes them through `services/mail/process-mail-job.ts` and the existing AWS SES sender. It is registered in `src/cron-worker.ts`, alongside the other background workers.

Run both the API and background processes from `platform/apps/server`:

```sh
pnpm run dev
pnpm run dev:cron
```

For production, compile the server and run `pnpm run start` and `pnpm run start:cron` in separate processes. Both need the same `REDIS_URL`, `DATABASE_URL`, `EMAIL_OTP_HASH_SECRET`, and SES configuration. This uses the existing Redis/Valkey infrastructure; it does not require AWS SQS or a new database migration beyond the OTP schema.

Jobs retry three times in total with exponential backoff starting at five seconds. The worker runs at concurrency two and starts at most one job per second. Expired, consumed, replaced, already-sent, and ineligible challenges are skipped. After the last delivery failure, the exact pending challenge is marked failed and its code is consumed. Its staged signup credentials are retained until expiry so Resend code can issue a fresh challenge; replaced challenges cannot be reused. Queue submission has a five-second deadline and does not buffer commands offline. Failed queue submission also invalidates only that challenge and returns a sanitized error (forgot-password keeps its generic response).

OTP values are encrypted with AES-256-GCM and bound to the challenge ID. The encryption key is derived from the OTP secret with a separate context; Redis stores neither the plaintext code nor recipient address. Completed and failed jobs are removed, and worker logs contain only job IDs and generic errors. Changing the OTP secret invalidates pending codes and encrypted jobs.

Delivery is at least once: if SES accepts an email but the process crashes before recording `sent`, a retry can send the same code again. Duplicate processing after `sent` is recorded does nothing. A code still expires ten minutes after issuance, so a prolonged queue backlog does not extend its validity. A resend or account change can invalidate an email already in flight; its code remains unusable.

The integration suite mocks queue submission and SES and exercises the processor against isolated PostgreSQL, including pending verification rejection, successful retry, final failure, duplicate/stale jobs, authenticated encryption, and queue rejection. It does not send real email or require a live Redis worker.
