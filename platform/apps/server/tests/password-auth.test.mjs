import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomBytes, createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
  hashPassword,
  verifyPassword,
  PasswordHashBusyError,
} from "../src/lib/password.ts";
import { signupSchema } from "../src/services/auth/password-auth-validation.ts";

const password = "simplepassword";
test("Argon2id generates salted hashes and verifies exact passwords", async () => {
  const start = performance.now();
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.match(first, /^\$argon2id\$v=19\$/);
  assert.deepEqual(first.split("$")[3].split(",").sort(), [
    "m=65536",
    "p=1",
    "t=3",
  ]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(first, password), true);
  assert.equal(await verifyPassword(first, password + " "), false);
  console.log(
    `Argon2id: two hashes and two verifications in ${Math.round(performance.now() - start)}ms`,
  );
});

test("hash concurrency is bounded", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => hashPassword(password)),
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    4,
  );
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected.reason instanceof PasswordHashBusyError);
});

test("signup accepts unverified addresses and enforces simple password boundaries", () => {
  const parsed = signupSchema.parse({
    email: "  Person@EXAMPLE.INVALID  ",
    password: "simplepassword",
    firstName: "  Test Maker  ",
  });
  assert.equal(parsed.email, "Person@example.invalid");
  assert.equal(parsed.password, "simplepassword");
  assert.equal(parsed.firstName, "Test Maker");
  for (const firstName of [undefined, "", "   ", "a".repeat(101)]) {
    assert.equal(
      signupSchema.safeParse({
        email: "a@example.invalid",
        password,
        firstName,
      }).success,
      false,
    );
  }
  for (const value of ["abcdefgh", "a".repeat(20), "Abcd1234", "abcd@123"]) {
    assert.equal(
      signupSchema.safeParse({
        email: "a@example.invalid",
        password: value,
        firstName: "Test Maker",
      }).success,
      true,
    );
  }
  for (const value of [
    "a".repeat(7),
    "a".repeat(21),
    "abcd efgh",
    "abcd\tefgh",
    "abcdefgh ",
  ]) {
    assert.equal(
      signupSchema.safeParse({
        email: "a@example.invalid",
        password: value,
        firstName: "Test Maker",
      }).success,
      false,
    );
  }
  assert.equal(
    signupSchema.safeParse({
      email: "invalid",
      password,
      firstName: "Test Maker",
    }).success,
    false,
  );
  assert.equal(
    signupSchema.safeParse({
      email: "a@example.invalid",
      password: "short",
      firstName: "Test Maker",
    }).success,
    false,
  );
});

test(
  "password routes with isolated PostgreSQL",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const requireDatabase = createRequire(
      new URL("../../../packages/database/package.json", import.meta.url),
    );
    const pg = requireDatabase("pg");
    const { default: express } = await import("express");
    const { default: cookieParser } = await import("cookie-parser");
    const schema = `password_auth_test_${randomBytes(8).toString("hex")}`;
    const admin = new pg.Pool({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const connectionUrl = new URL(process.env.TEST_DATABASE_URL);
    connectionUrl.searchParams.set("options", `-c search_path=${schema}`);
    const fixture = new pg.Pool({ connectionString: connectionUrl.toString() });
    let server;
    let repo;
    let redis;
    let mailQueue;
    try {
      await fixture.query(`
      CREATE TABLE users (
        id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), email varchar(255) NOT NULL UNIQUE,
        username varchar(255) NOT NULL UNIQUE, tier text NOT NULL DEFAULT 'tier1',
        first_name text NOT NULL, last_name text, role text NOT NULL DEFAULT 'user',
        status text NOT NULL DEFAULT 'active', email_verified_at timestamp, auth_version integer NOT NULL DEFAULT 0,
        primary_login_method text NOT NULL DEFAULT 'github', forgejo_id integer UNIQUE,
        created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp DEFAULT now(),
        CONSTRAINT users_username_unique UNIQUE(username)
      );
      CREATE UNIQUE INDEX users_email_case_insensitive_unique ON users(lower(email));
      CREATE TABLE email_auth_challenges (
        id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), purpose varchar(32) NOT NULL,
        email varchar(255) NOT NULL, otp_digest varchar(64) NOT NULL, staged_password_hash text, staged_name varchar(100),
        attempt_count integer NOT NULL DEFAULT 0, delivery_status varchar(16) NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, consumed_at timestamptz
      );
      CREATE TABLE user_password_credentials (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        password_hash text NOT NULL, revoked_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE user_settings (
        id uuid UNIQUE DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES users(id),
        default_pr_model varchar, default_issue_fixer_model varchar, default_comment_model varchar,
        default_model varchar, telegram_chat_id bigint UNIQUE,
        default_issue_instance_auto_terminate_after_minutes integer NOT NULL DEFAULT 30,
        default_pr_instance_auto_terminate_after_minutes integer NOT NULL DEFAULT 30,
        default_manual_instance_auto_terminate_after_minutes integer NOT NULL DEFAULT 120,
        created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp DEFAULT now()
      );
      CREATE TABLE user_wallet (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES users(id),
        balance bigint NOT NULL DEFAULT 0, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp DEFAULT now()
      );
      CREATE TABLE accounts (
        id uuid UNIQUE DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
        provider text NOT NULL, provider_account_id varchar(255) NOT NULL, provider_username varchar(255),
        status text NOT NULL DEFAULT 'active', verified boolean NOT NULL DEFAULT true, token varchar(255) NOT NULL,
        deleted_at timestamp, last_login_at timestamp, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp,
        UNIQUE(provider, provider_account_id), UNIQUE(user_id, provider)
      );
      CREATE TABLE auth_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
        token_hash varchar(128) NOT NULL UNIQUE, client_type text NOT NULL,
        expires_at timestamp NOT NULL, revoked_at timestamp, created_at timestamp NOT NULL DEFAULT now(),
        last_used_at timestamp, user_agent text, ip_address varchar
      );
      CREATE TABLE user_login_logs (
        id uuid UNIQUE DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), ip_address varchar,
        user_agent varchar, login_method text DEFAULT 'github',
        created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp DEFAULT now()
      );
    `);
      const envSource = await readFile(
        new URL("../src/lib/env.ts", import.meta.url),
        "utf8",
      );
      for (const match of envSource.matchAll(/^  ([A-Z_0-9]+):/gm)) {
        process.env[match[1]] = "test-placeholder";
      }
      Object.assign(process.env, {
        NODE_ENV: "test",
        PORT: "0",
        PROFIT_PRECENTAGE: "10",
        DATABASE_URL: connectionUrl.toString(),
        ALLOWED_ORIGINS: "https://app.example.test",
        BOAT_BASE_URL: "https://boat.example.test",
        REDIS_URL: "redis://127.0.0.1:1",
        DOMAIN: "localhost",
        NEXTJS_APP_URL: "https://app.example.test",
        BACKEND_URL: "https://server.example.test",
        VIBEONGO_APP_DEEP_LINK: "vibeongo:/",
        SSH_GATEWAY_PORT: "8005",
        AWS_SES_FROM_EMAIL: "auth@example.test",
        EMAIL_OTP_HASH_SECRET: "a".repeat(64),
        AWS_SES_REGION: "us-east-1",
      });
      repo = await import("@repo/db");
      ({ redis } = await import("../src/lib/valkey.ts"));
      redis.disconnect();
      // Exercise HTTP rate-limit behavior without touching the user's Valkey instance.
      const counters = new Map();
      const oauthCache = new Map();
      redis.set = async (key, value) => {
        oauthCache.set(key, value);
        return "OK";
      };
      redis.getdel = async (key) => {
        const value = oauthCache.get(key);
        oauthCache.delete(key);
        return value ?? null;
      };

      redis.eval = async (_script, _numKeys, key) => {
        const count = (counters.get(key) ?? 0) + 1;
        counters.set(key, count);
        return [count, 900];
      };
      const { signup, signin, mobileSignup, mobileSignin, getCurrentUser } =
        await import("../src/controllers/user/user-controller.ts");
      const {
        requireTrustedAuthOrigin,
        requireTrustedMobileAuthOrigin,
        signupRateLimit,
        signinRateLimit,
        otpVerifyRateLimit,
      } = await import("../src/middlewares/password-auth-limits.ts");
      const { checkAuthorization } =
        await import("../src/middlewares/check-authorization.ts");
      const { logout } = await import("../src/controllers/auth/logout.ts");
      const {
        githubConnectionStatus,
        startGithubConnection,
        githubConnectionCallback,
        completeMobileGithubConnection,
      } = await import("../src/controllers/auth/github-connection.ts");
      const { connectGithubIdentity } =
        await import("../src/services/auth/github-connection.ts");
      const { default: axios } = await import("axios");
      const originalAxiosPost = axios.post;
      const originalAxiosGet = axios.get;
      axios.post = async () => ({
        data: { access_token: "github-test-token" },
      });
      axios.get = async (url) => ({
        data: url.endsWith("/emails")
          ? [{ email: "github@example.invalid", primary: true, verified: true }]
          : { id: 456, login: "connected_github", name: "Connected Maker" },
      });
      const { SES_CLIENT } = await import("../src/services/mail/send-mail.ts");
      const sentEmails = [];
      let failEmail = false;
      SES_CLIENT.send = async (command) => {
        if (failEmail) throw new Error("SECRET provider error");
        sentEmails.push({
          email: command.input.Destination.ToAddresses[0],
          otp: command.input.Message.Body.Text.Data.match(/is (\d{6})/)[1],
        });
        return { MessageId: "test" };
      };
      ({ mailQueue } = await import("../src/jobs/mail.ts"));
      const { processMailJob } =
        await import("../src/services/mail/process-mail-job.ts");
      const { decryptMailOtp } =
        await import("../src/services/mail/mail-otp-payload.ts");
      let failQueue = false;
      let deferMail = false;
      const mailJobs = [];
      mailQueue.add = async (name, data, opts) => {
        if (failQueue) throw new Error("Queue unavailable");
        assert.equal(name, "send-auth-otp");
        assert.equal(opts.attempts, 3);
        assert.equal(opts.removeOnComplete, true);
        assert.equal(opts.removeOnFail, true);
        assert.equal(opts.jobId, `mail-otp-${data.challengeId}`);
        assert.equal(Object.hasOwn(data, "otp"), false);
        assert.equal(Object.hasOwn(data, "email"), false);
        mailJobs.push(data);
        if (!deferMail) {
          try {
            await processMailJob(data, true);
          } catch {}
        }
        return { id: opts.jobId };
      };
      const latestOtp = (email) =>
        sentEmails.findLast(
          (mail) => mail.email.toLowerCase() === email.toLowerCase(),
        ).otp;
      const { verifyEmail, resendVerification, forgotPassword, resetPassword } =
        await import("../src/controllers/user/email-auth-controller.ts");
      const app = express();
      app.use(express.json(), cookieParser());
      app.post("/signup", requireTrustedAuthOrigin, signupRateLimit, signup);
      app.post("/signin", requireTrustedAuthOrigin, signinRateLimit, signin);
      app.post(
        "/mobile/signup",
        requireTrustedMobileAuthOrigin,
        signupRateLimit,
        mobileSignup,
      );
      app.post(
        "/mobile/signin",
        requireTrustedMobileAuthOrigin,
        signinRateLimit,
        mobileSignin,
      );
      app.post("/verify-email", verifyEmail);
      app.post(
        "/limited-verify",
        requireTrustedMobileAuthOrigin,
        otpVerifyRateLimit,
        verifyEmail,
      );
      app.post("/resend-verification", resendVerification);
      app.post("/forgot-password", forgotPassword);
      app.post("/reset-password", resetPassword);
      app.get("/me", checkAuthorization(["user"]), getCurrentUser);
      app.get("/logout", logout);
      app.get(
        "/connection",
        checkAuthorization(["user"]),
        githubConnectionStatus,
      );
      app.post(
        "/connection",
        requireTrustedMobileAuthOrigin,
        checkAuthorization(["user"]),
        startGithubConnection,
      );
      app.get("/github-callback", githubConnectionCallback);
      app.post(
        "/connection/complete",
        requireTrustedMobileAuthOrigin,
        checkAuthorization(["user"]),
        completeMobileGithubConnection,
      );

      app.use((error, _req, res, _next) =>
        res.status(error.status ?? 500).json({
          message: error.message,
          ...(error.code ? { code: error.code } : {}),
        }),
      );
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}`;
      const post = (path, body, origin = "https://app.example.test") =>
        fetch(base + path, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin },
          body: JSON.stringify(body),
        });
      const credentials = {
        email: "Person@example.invalid",
        password,
        firstName: "Test Maker",
      };
      const { firstName: _name, ...missingName } = credentials;
      assert.equal((await post("/signup", missingName)).status, 400);
      assert.equal(
        (await post("/mobile/signup", { ...credentials, firstName: "   " }))
          .status,
        400,
      );
      counters.clear();
      const signupResponse = await post("/signup", credentials);
      assert.equal(signupResponse.status, 202);
      assert.equal(signupResponse.headers.get("set-cookie"), null);
      const pendingSignup = (await signupResponse.json()).data;
      assert.equal(pendingSignup.verificationRequired, true);
      assert.equal(pendingSignup.token, undefined);
      assert.equal(
        (await fixture.query("SELECT count(*) FROM auth_sessions")).rows[0]
          .count,
        "0",
      );
      assert.equal(
        (await fixture.query("SELECT count(*) FROM user_login_logs")).rows[0]
          .count,
        "0",
      );
      const unverifiedLogin = await post("/signin", credentials);
      assert.equal(unverifiedLogin.status, 403);
      assert.equal((await unverifiedLogin.json()).code, "EMAIL_NOT_VERIFIED");
      const unverifiedUser = (await fixture.query("SELECT * FROM users"))
        .rows[0];
      const { default: jwt } = await import("jsonwebtoken");
      const oldJwt = jwt.sign(
        { id: unverifiedUser.id },
        process.env.JWT_SECRET,
      );
      assert.equal(
        (
          await fetch(base + "/me", {
            headers: { Authorization: `Bearer ${oldJwt}` },
          })
        ).status,
        401,
      );
      const verify = {
        email: credentials.email,
        challengeId: pendingSignup.challengeId,
        otp: latestOtp(credentials.email),
      };
      assert.equal((await post("/verify-email", verify)).status, 200);
      assert.equal((await post("/verify-email", verify)).status, 400);
      assert.equal(
        (
          await fetch(base + "/me", {
            headers: { Authorization: `Bearer ${oldJwt}` },
          })
        ).status,
        401,
      );
      const signupLogin = await post("/signin", credentials);
      assert.equal(signupLogin.status, 200);
      const signupBody = await signupLogin.json();
      assert.equal(signupBody.data.emailVerified, true);
      assert.equal(signupBody.data.firstName, "Test Maker");
      assert.equal(signupBody.data.primaryLoginMethod, "email_password");
      assert.match(signupBody.data.username, /^vog_[a-f0-9]{12}$/);
      const cookie = signupLogin.headers.get("set-cookie").split(";")[0];
      assert.match(signupLogin.headers.get("set-cookie"), /HttpOnly/);
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: cookie } })).status,
        200,
      );
      assert.equal(
        (await fixture.query("SELECT count(*) FROM accounts")).rows[0].count,
        "0",
      );
      assert.equal(
        (await fixture.query("SELECT balance FROM user_wallet")).rows[0]
          .balance,
        "0",
      );
      assert.equal(
        (await fixture.query("SELECT login_method FROM user_login_logs"))
          .rows[0].login_method,
        "email_password",
      );
      assert.equal(
        (
          await post("/signup", {
            ...credentials,
            email: "PERSON@EXAMPLE.INVALID",
          })
        ).status,
        409,
      );
      const nativePost = (path, body) =>
        fetch(base + path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      const sessionsBefore = (
        await fixture.query("SELECT count(*) FROM auth_sessions")
      ).rows[0].count;
      const nativeLogin = await nativePost("/mobile/signin", credentials);
      assert.equal(nativeLogin.status, 200);
      assert.equal(nativeLogin.headers.get("set-cookie"), null);
      const nativeBody = await nativeLogin.json();
      const claims = jwt.verify(nativeBody.token, process.env.JWT_SECRET);
      assert.equal(claims.id, signupBody.data.id);
      assert.equal(claims.exp - claims.iat, 30 * 86400);
      assert.equal(
        (await fixture.query("SELECT count(*) FROM auth_sessions")).rows[0]
          .count,
        sessionsBefore,
      );
      const nativeMe = await fetch(base + "/me", {
        headers: { Authorization: `Bearer ${nativeBody.token}` },
      });
      assert.equal(nativeMe.status, 200);
      assert.deepEqual((await nativeMe.json()).data, nativeBody.data);
      assert.equal(
        (
          await nativePost("/mobile/signin", {
            ...credentials,
            password: password + "wrong",
          })
        ).status,
        401,
      );
      assert.equal(
        (await post("/mobile/signin", credentials, "https://evil.example.test"))
          .status,
        403,
      );
      assert.equal((await nativePost("/signin", credentials)).status, 403);
      counters.clear();
      const login = await post("/signin", {
        ...credentials,
        email: "PERSON@EXAMPLE.INVALID",
      });
      assert.equal(login.status, 200);
      const loginCookie = login.headers.get("set-cookie").split(";")[0];
      assert.notEqual(loginCookie, cookie);
      const wrong = await post("/signin", {
        ...credentials,
        password: password + "wrong",
      });
      const unknown = await post("/signin", {
        ...credentials,
        email: "unknown@example.invalid",
      });
      assert.equal(wrong.status, 401);
      assert.equal(unknown.status, 401);
      assert.deepEqual(await wrong.json(), await unknown.json());
      await fetch(base + "/logout", { headers: { Cookie: loginCookie } });
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: loginCookie } }))
          .status,
        401,
      );
      assert.equal(
        (await post("/signin", credentials, "https://evil.example.test"))
          .status,
        403,
      );
      await fixture.query(
        "UPDATE user_password_credentials SET revoked_at = now()",
      );
      assert.equal((await post("/signin", credentials)).status, 401);
      await fixture.query(
        "UPDATE user_password_credentials SET revoked_at = NULL; UPDATE users SET status = 'banned'",
      );
      assert.equal((await post("/signin", credentials)).status, 401);
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: cookie } })).status,
        401,
      );
      await fixture.query(
        "UPDATE users SET status = 'active', primary_login_method = 'github'",
      );
      assert.equal((await post("/signin", credentials)).status, 401);
      await fixture.query(
        "INSERT INTO accounts(user_id, provider, provider_account_id, token) SELECT id, 'github', '123', 'test-token' FROM users",
      );
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: cookie } })).status,
        200,
      );
      await fixture.query("UPDATE accounts SET verified = false");
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: cookie } })).status,
        401,
      );
      counters.clear();
      const race = await Promise.all([
        post("/signup", { ...credentials, email: "race@example.invalid" }),
        post("/signup", { ...credentials, email: "RACE@example.invalid" }),
      ]);
      assert.deepEqual(
        race.map((response) => response.status).sort(),
        [202, 429],
      );
      counters.clear();
      const nativeSignup = await nativePost("/mobile/signup", {
        ...credentials,
        email: "mobile@example.invalid",
      });
      assert.equal(nativeSignup.status, 202);
      assert.equal(nativeSignup.headers.get("set-cookie"), null);
      const nativeChallenge = (await nativeSignup.json()).data;
      assert.equal(
        (
          await post("/verify-email", {
            email: "mobile@example.invalid",
            challengeId: nativeChallenge.challengeId,
            otp: latestOtp("mobile@example.invalid"),
          })
        ).status,
        200,
      );
      const createdNative = await (
        await nativePost("/mobile/signin", {
          ...credentials,
          email: "mobile@example.invalid",
        })
      ).json();
      assert.equal(
        jwt.verify(createdNative.token, process.env.JWT_SECRET).id,
        createdNative.data.id,
      );
      assert.equal(
        (
          await fetch(base + "/me", {
            headers: { Authorization: `Bearer ${createdNative.token}` },
          })
        ).status,
        200,
      );

      // Exercise account linking using fake provider responses and expiring-state storage.
      await fixture.query("UPDATE users SET forgejo_id = 99 WHERE id = $1", [
        createdNative.data.id,
      ]);
      const verifier = "a".repeat(43);
      const appState = "appstate10";
      const challenge = createHash("sha256")
        .update(verifier)
        .digest("base64url");
      const connectionPost = (
        body,
        path = "/connection",
        token = createdNative.token,
      ) =>
        fetch(base + path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      assert.equal(
        (await nativePost("/connection", { clientType: "web" })).status,
        401,
      );
      assert.equal(
        (await connectionPost({ clientType: "mobile" })).status,
        400,
      );
      const begin = async () => {
        const response = await connectionPost({
          clientType: "mobile",
          state: appState,
          codeChallenge: challenge,
        });
        assert.equal(response.status, 200);
        const url = new URL((await response.json()).data.url);
        assert.equal(url.hostname, "github.com");
        assert.equal(
          url.searchParams.get("redirect_uri"),
          "https://server.example.test/api/v1/auth/github/callback",
        );
        return url.searchParams.get("state");
      };
      const callback = (state, headers = {}) =>
        fetch(
          base +
            `/github-callback?code=test-code&state=${encodeURIComponent(state)}`,
          { redirect: "manual", headers },
        );
      const firstState = await begin();
      const firstCallback = await callback(firstState);
      assert.equal(firstCallback.status, 302);
      const firstReturn = new URL(firstCallback.headers.get("location"));
      assert.equal(firstReturn.protocol, "vibeongo:");
      assert.equal(firstReturn.hostname, "auth");
      assert.equal(firstReturn.pathname, "/github-connected");
      assert.equal(firstReturn.searchParams.get("state"), appState);
      assert.equal(
        (
          await fixture.query(
            "SELECT count(*) FROM accounts WHERE user_id = $1",
            [createdNative.data.id],
          )
        ).rows[0].count,
        "0",
      );
      assert.equal(
        (
          await connectionPost(
            {
              ticket: firstReturn.searchParams.get("ticket"),
              state: appState,
              codeVerifier: "b".repeat(43),
            },
            "/connection/complete",
          )
        ).status,
        401,
      );
      assert.equal((await callback(firstState)).status, 400);
      const goodCallback = await callback(await begin());
      const goodReturn = new URL(goodCallback.headers.get("location"));
      const completion = await connectionPost(
        {
          ticket: goodReturn.searchParams.get("ticket"),
          state: appState,
          codeVerifier: verifier,
        },
        "/connection/complete",
      );
      assert.equal(completion.status, 200);
      const connected = (await completion.json()).data;
      assert.equal(connected.id, createdNative.data.id);
      assert.equal(connected.username, "connected_github");
      assert.equal(connected.email, "github@example.invalid");
      assert.equal(connected.emailVerified, true);
      assert.equal(connected.primaryLoginMethod, "github");
      assert.equal(connected.firstName, "Connected");
      assert.equal(connected.lastName, "Maker");
      assert.ok(
        (
          await fixture.query(
            "SELECT revoked_at FROM user_password_credentials WHERE user_id = $1",
            [connected.id],
          )
        ).rows[0].revoked_at,
      );
      assert.equal(
        (
          await nativePost("/mobile/signin", {
            email: connected.email,
            password,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await fetch(base + "/me", {
            headers: { Authorization: `Bearer ${createdNative.token}` },
          })
        ).status,
        200,
      );
      assert.deepEqual(
        (
          await (
            await fetch(base + "/connection", {
              headers: { Authorization: `Bearer ${createdNative.token}` },
            })
          ).json()
        ).data,
        { connected: true, username: "connected_github" },
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT count(*) FROM user_wallet WHERE user_id = $1",
            [connected.id],
          )
        ).rows[0].count,
        "1",
      );
      const [other] = await repo.db
        .insert(repo.users)
        .values({
          email: "other@example.invalid",
          username: "other_maker",
          first_name: "Other",
          primary_login_method: "email_password",
        })
        .returning();
      await assert.rejects(
        connectGithubIdentity(other.id, {
          id: "456",
          username: "connected_github",
          email: "github@example.invalid",
          token: "test",
        }),
        (error) => error.status === 409,
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT primary_login_method FROM users WHERE id = $1",
            [other.id],
          )
        ).rows[0].primary_login_method,
        "email_password",
      );
      const { createWebSession } = await import("../src/lib/auth-session.ts");
      const connectionCookie = `session=${await createWebSession({ userId: connected.id })}`;
      const webBegin = async () => {
        const response = await fetch(base + "/connection", {
          method: "POST",
          headers: {
            Cookie: connectionCookie,
            Origin: "https://app.example.test",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clientType: "web" }),
        });
        assert.equal(response.status, 200);
        return new URL((await response.json()).data.url).searchParams.get(
          "state",
        );
      };
      const mismatched = await callback(await webBegin(), { Cookie: cookie });
      assert.equal(
        new URL(mismatched.headers.get("location")).searchParams.get("github"),
        "error",
      );
      const webLinked = await callback(await webBegin(), {
        Cookie: connectionCookie,
      });
      assert.equal(webLinked.status, 302);
      assert.equal(
        new URL(webLinked.headers.get("location")).searchParams.get("github"),
        "connected",
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT count(*) FROM accounts WHERE user_id = $1",
            [connected.id],
          )
        ).rows[0].count,
        "1",
      );
      // A new email user can provision their repository account without GitHub.
      const { ensureUserForgejoAccount } =
        await import("../src/services/forgejo/ensure-user-account.ts");
      const { forgejoAPIClient } =
        await import("../src/services/forgejo/user-actions.ts");
      const originalForgejoGet = forgejoAPIClient.get;
      const originalForgejoPost = forgejoAPIClient.post;
      let repositoryAccountCreates = 0;
      forgejoAPIClient.get = async () => {
        throw { isAxiosError: true, response: { status: 404 } };
      };
      forgejoAPIClient.post = async (_url, body) => {
        repositoryAccountCreates++;
        assert.equal(body.username, other.username);
        return { status: 201, data: { id: 10001, username: other.username } };
      };
      const provisioned = await Promise.all([
        ensureUserForgejoAccount(other.id),
        ensureUserForgejoAccount(other.id),
      ]);
      assert.deepEqual(provisioned, [10001, 10001]);
      assert.equal(repositoryAccountCreates, 1);
      assert.equal(
        (
          await fixture.query("SELECT forgejo_id FROM users WHERE id = $1", [
            other.id,
          ])
        ).rows[0].forgejo_id,
        10001,
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT count(*) FROM accounts WHERE user_id = $1",
            [other.id],
          )
        ).rows[0].count,
        "0",
      );
      forgejoAPIClient.get = originalForgejoGet;
      forgejoAPIClient.post = originalForgejoPost;
      axios.post = originalAxiosPost;
      axios.get = originalAxiosGet;
      counters.clear();
      // Signup retry stages edited credentials until ownership is proven.
      const retryCredentials = {
        ...credentials,
        email: "retry@example.invalid",
      };
      const initialRetry = (
        await (await post("/signup", retryCredentials)).json()
      ).data;
      const firstOtp = latestOtp(retryCredentials.email);
      const originalRetryUser = (
        await fixture.query("SELECT * FROM users WHERE email = $1", [
          retryCredentials.email,
        ])
      ).rows[0];
      assert.equal(
        (
          await post("/signup", {
            ...retryCredentials,
            password: "replacementpass",
          })
        ).status,
        429,
      );
      await fixture.query(
        "UPDATE email_auth_challenges SET created_at = now() - interval '61 seconds' WHERE user_id = $1",
        [originalRetryUser.id],
      );
      counters.clear();
      const secondRetryResponse = await post("/signup", {
        ...retryCredentials,
        password: "replacementpass",
        firstName: "New Name",
      });
      const secondRetryBody = await secondRetryResponse.json();
      assert.equal(
        secondRetryResponse.status,
        202,
        JSON.stringify(secondRetryBody),
      );
      const secondRetry = secondRetryBody.data;
      assert.notEqual(initialRetry.challengeId, secondRetry.challengeId);
      assert.equal(
        (
          await post("/verify-email", {
            email: retryCredentials.email,
            challengeId: initialRetry.challengeId,
            otp: firstOtp,
          })
        ).status,
        400,
      );
      const untouchedHash = (
        await fixture.query(
          "SELECT password_hash FROM user_password_credentials WHERE user_id = $1",
          [originalRetryUser.id],
        )
      ).rows[0].password_hash;
      assert.equal(
        await verifyPassword(untouchedHash, retryCredentials.password),
        true,
      );
      assert.equal(
        (
          await fixture.query("SELECT first_name FROM users WHERE id = $1", [
            originalRetryUser.id,
          ])
        ).rows[0].first_name,
        "Test Maker",
      );
      const secondOtp = latestOtp(retryCredentials.email);
      await fixture.query(
        "UPDATE email_auth_challenges SET created_at = now() - interval '61 seconds' WHERE id = $1",
        [secondRetry.challengeId],
      );
      const resent = await post("/resend-verification", {
        email: retryCredentials.email,
        challengeId: secondRetry.challengeId,
      });
      assert.equal(resent.status, 202);
      const resentId = (await resent.json()).data.challengeId;
      assert.equal(
        (
          await post("/verify-email", {
            email: retryCredentials.email,
            challengeId: secondRetry.challengeId,
            otp: secondOtp,
          })
        ).status,
        400,
      );
      const verifiedRetry = {
        email: retryCredentials.email,
        challengeId: resentId,
        otp: latestOtp(retryCredentials.email),
      };
      const concurrentlyVerified = await Promise.all([
        post("/verify-email", verifiedRetry),
        post("/verify-email", verifiedRetry),
      ]);
      assert.deepEqual(
        concurrentlyVerified.map((r) => r.status).sort(),
        [200, 400],
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT id, first_name FROM users WHERE email = $1",
            [retryCredentials.email],
          )
        ).rows[0].id,
        originalRetryUser.id,
      );
      assert.equal((await post("/signin", retryCredentials)).status, 401);
      assert.equal(
        (
          await post("/signin", {
            ...retryCredentials,
            password: "replacementpass",
          })
        ).status,
        200,
      );

      // Reset OTP is separate, single-use, and revokes existing cookies and JWTs.
      const resetCredentials = {
        ...retryCredentials,
        password: "replacementpass",
      };
      const resetLogin = await post("/signin", resetCredentials);
      const resetCookie = resetLogin.headers.get("set-cookie").split(";")[0];
      const resetNative = await (
        await nativePost("/mobile/signin", resetCredentials)
      ).json();
      const forgot = await post("/forgot-password", {
        email: retryCredentials.email,
      });
      assert.equal(forgot.status, 202);
      const resetId = (await forgot.json()).data.challengeId;
      const resetOtp = latestOtp(retryCredentials.email);
      assert.equal(
        (
          await post("/verify-email", {
            email: retryCredentials.email,
            challengeId: resetId,
            otp: resetOtp,
          })
        ).status,
        400,
      );
      const resetBody = {
        email: retryCredentials.email,
        challengeId: resetId,
        otp: resetOtp,
        newPassword: "changedpassword",
      };
      assert.equal(
        (
          await post("/reset-password", {
            ...resetBody,
            otp: resetOtp === "000000" ? "111111" : "000000",
          })
        ).status,
        400,
      );
      const concurrentResets = await Promise.all([
        post("/reset-password", resetBody),
        post("/reset-password", resetBody),
      ]);
      assert.deepEqual(
        concurrentResets.map((response) => response.status).sort(),
        [200, 400],
      );
      assert.equal((await post("/reset-password", resetBody)).status, 400);
      assert.equal(
        (await fetch(base + "/me", { headers: { Cookie: resetCookie } }))
          .status,
        401,
      );
      assert.equal(
        (
          await fetch(base + "/me", {
            headers: { Authorization: `Bearer ${resetNative.token}` },
          })
        ).status,
        401,
      );
      assert.equal((await post("/signin", resetCredentials)).status, 401);
      assert.equal(
        (
          await post("/signin", {
            ...resetCredentials,
            password: "changedpassword",
          })
        ).status,
        200,
      );
      const emailsBeforeUnknown = sentEmails.length;
      const unknownReset = await post("/forgot-password", {
        email: "unknown@example.invalid",
      });
      assert.equal(unknownReset.status, 202);
      assert.equal(sentEmails.length, emailsBeforeUnknown);
      assert.deepEqual(
        Object.keys((await unknownReset.json()).data).sort(),
        [
          "challengeId",
          "expiresInSeconds",
          "message",
          "resendAfterSeconds",
        ].sort(),
      );

      // Five bad codes remain exhausted even when a new code is sent.
      counters.clear();
      const budgetEmail = "budget@example.invalid";
      const budgetSignup = (
        await (
          await post("/signup", { ...credentials, email: budgetEmail })
        ).json()
      ).data;
      const budgetOtp = latestOtp(budgetEmail);
      for (let i = 0; i < 5; i++)
        assert.equal(
          (
            await post("/verify-email", {
              email: budgetEmail,
              challengeId: budgetSignup.challengeId,
              otp: budgetOtp === "000000" ? "111111" : "000000",
            })
          ).status,
          400,
        );
      assert.equal(
        (
          await post("/verify-email", {
            email: budgetEmail,
            challengeId: budgetSignup.challengeId,
            otp: budgetOtp,
          })
        ).status,
        400,
      );
      await fixture.query(
        "UPDATE email_auth_challenges SET created_at = now() - interval '61 seconds' WHERE id = $1",
        [budgetSignup.challengeId],
      );
      const budgetResend = (
        await (
          await post("/resend-verification", {
            email: budgetEmail,
            challengeId: budgetSignup.challengeId,
          })
        ).json()
      ).data;
      assert.equal(
        (
          await post("/verify-email", {
            email: budgetEmail,
            challengeId: budgetResend.challengeId,
            otp: latestOtp(budgetEmail),
          })
        ).status,
        400,
      );

      // Expiry, email binding, malformed codes, and ineligible recovery.
      counters.clear();
      const expiredEmail = "expired@example.invalid";
      const expiring = (
        await (
          await post("/signup", { ...credentials, email: expiredEmail })
        ).json()
      ).data;
      const expiringOtp = latestOtp(expiredEmail);
      assert.equal(
        (
          await post("/verify-email", {
            email: retryCredentials.email,
            challengeId: expiring.challengeId,
            otp: expiringOtp,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post("/verify-email", {
            email: expiredEmail,
            challengeId: expiring.challengeId,
            otp: "12345",
          })
        ).status,
        400,
      );
      await fixture.query(
        "UPDATE email_auth_challenges SET expires_at = now() - interval '1 second' WHERE id = $1",
        [expiring.challengeId],
      );
      assert.equal(
        (
          await post("/verify-email", {
            email: expiredEmail,
            challengeId: expiring.challengeId,
            otp: expiringOtp,
          })
        ).status,
        400,
      );
      const ineligibleEmailsBefore = sentEmails.length;
      for (const email of [expiredEmail, "github@example.invalid"]) {
        assert.equal((await post("/forgot-password", { email })).status, 202);
      }
      assert.equal(sentEmails.length, ineligibleEmailsBefore);
      const { cleanupEmailAuthChallenges } =
        await import("../src/services/auth/email-otp.ts");
      await cleanupEmailAuthChallenges();
      assert.equal(
        (
          await fixture.query(
            "SELECT staged_password_hash FROM email_auth_challenges WHERE id = $1",
            [expiring.challengeId],
          )
        ).rows[0].staged_password_hash,
        null,
      );

      // API only enqueues. A code cannot verify until the worker has delivered it.
      counters.clear();
      deferMail = true;
      const queuedEmail = "queued@example.invalid";
      const emailsBeforeQueue = sentEmails.length;
      const queuedResponse = await post("/signup", {
        ...credentials,
        email: queuedEmail,
      });
      assert.equal(queuedResponse.status, 202);
      const queuedChallenge = (await queuedResponse.json()).data;
      assert.equal(sentEmails.length, emailsBeforeQueue);
      const queuedJob = mailJobs.at(-1);
      const queuedOtp = decryptMailOtp(
        queuedJob.challengeId,
        queuedJob.encryptedOtp,
      );
      assert.equal(
        (
          await post("/verify-email", {
            email: queuedEmail,
            challengeId: queuedChallenge.challengeId,
            otp: queuedOtp,
          })
        ).status,
        400,
      );
      // An intermediate SES failure retains the pending challenge for a later retry.
      failEmail = true;
      await assert.rejects(
        processMailJob(queuedJob, false),
        /Mail delivery failed/,
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT delivery_status FROM email_auth_challenges WHERE id = $1",
            [queuedChallenge.challengeId],
          )
        ).rows[0].delivery_status,
        "pending",
      );
      failEmail = false;
      await processMailJob(queuedJob, false);
      await processMailJob(queuedJob, true);
      assert.equal(sentEmails.length, emailsBeforeQueue + 1);
      assert.equal(
        (
          await post("/verify-email", {
            email: queuedEmail,
            challengeId: queuedChallenge.challengeId,
            otp: queuedOtp,
          })
        ).status,
        200,
      );
      // Tampering with the bound challenge ID fails authenticated decryption.
      assert.throws(() =>
        decryptMailOtp("different-id", queuedJob.encryptedOtp),
      );
      // Replaced and expired jobs must not deliver an old code.
      const staleEmail = "stale-mail@example.invalid";
      const staleResponse = await post("/signup", {
        ...credentials,
        email: staleEmail,
      });
      const staleId = (await staleResponse.json()).data.challengeId;
      const staleJob = mailJobs.at(-1);
      await fixture.query(
        "UPDATE email_auth_challenges SET created_at = now() - interval '61 seconds' WHERE id = $1",
        [staleId],
      );
      const replacementResponse = await post("/signup", {
        ...credentials,
        email: staleEmail,
      });
      assert.equal(replacementResponse.status, 202);
      const replacementId = (await replacementResponse.json()).data.challengeId;
      const replacementJob = mailJobs.at(-1);
      const staleEmailsBefore = sentEmails.length;
      await processMailJob(staleJob, true);
      assert.equal(sentEmails.length, staleEmailsBefore);
      assert.equal(
        (
          await fixture.query(
            "SELECT delivery_status FROM email_auth_challenges WHERE id = $1",
            [replacementId],
          )
        ).rows[0].delivery_status,
        "pending",
      );
      await fixture.query(
        "UPDATE email_auth_challenges SET expires_at = now() - interval '1 second' WHERE id = $1",
        [replacementId],
      );
      await processMailJob(replacementJob, true);
      assert.equal(sentEmails.length, staleEmailsBefore);
      // Producer failures return an error and invalidate only their challenge.
      failQueue = true;
      counters.clear();
      assert.equal(
        (
          await post("/signup", {
            ...credentials,
            email: "queue-failed@example.invalid",
          })
        ).status,
        503,
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT delivery_status FROM email_auth_challenges WHERE email = 'queue-failed@example.invalid'",
          )
        ).rows[0].delivery_status,
        "failed",
      );
      failQueue = false;
      deferMail = false;
      counters.clear();
      // Delivery failure leaves no usable challenge or disclosed provider payload.
      failEmail = true;
      counters.clear();
      const failedSignup = await post("/signup", {
        ...credentials,
        email: "delivery@example.invalid",
      });
      assert.equal(failedSignup.status, 202);
      assert.equal(
        JSON.stringify(await failedSignup.json()).includes("SECRET"),
        false,
      );
      const failedChallenge = (
        await fixture.query(
          "SELECT * FROM email_auth_challenges WHERE email = 'delivery@example.invalid'",
        )
      ).rows[0];
      assert.equal(failedChallenge.delivery_status, "failed");
      assert.ok(failedChallenge.staged_password_hash);
      // A terminal delivery failure can be resent without re-entering credentials.
      assert.equal(
        (
          await post("/verify-email", {
            email: "delivery@example.invalid",
            challengeId: failedChallenge.id,
            otp: decryptMailOtp(
              failedChallenge.id,
              mailJobs.at(-1).encryptedOtp,
            ),
          })
        ).status,
        400,
      );
      failEmail = false;
      const recovered = await post("/resend-verification", {
        email: "delivery@example.invalid",
        challengeId: failedChallenge.id,
      });
      assert.equal(recovered.status, 202);
      const recoveredId = (await recovered.json()).data.challengeId;
      assert.notEqual(recoveredId, failedChallenge.id);
      assert.equal(
        (
          await post("/resend-verification", {
            email: "delivery@example.invalid",
            challengeId: failedChallenge.id,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post("/verify-email", {
            email: "delivery@example.invalid",
            challengeId: recoveredId,
            otp: latestOtp("delivery@example.invalid"),
          })
        ).status,
        200,
      );
      // A completed signup cannot be reopened by resend.
      assert.equal(
        (
          await post("/resend-verification", {
            email: "delivery@example.invalid",
            challengeId: recoveredId,
          })
        ).status,
        400,
      );
      counters.clear();
      // Force a write failure late in signup and confirm every earlier write rolls back.
      await fixture.query(
        "ALTER TABLE user_wallet ADD CONSTRAINT fail_signup CHECK (balance > 0) NOT VALID",
      );
      assert.equal(
        (
          await post("/signup", {
            ...credentials,
            email: "rollback@example.invalid",
          })
        ).status,
        500,
      );
      assert.equal(
        (
          await fixture.query(
            "SELECT count(*) FROM users WHERE email = 'rollback@example.invalid'",
          )
        ).rows[0].count,
        "0",
      );
      counters.clear();
      for (let i = 0; i < 5; i++)
        assert.equal((await post("/signup", {})).status, 400);
      for (let i = 0; i < 20; i++)
        assert.equal((await post("/limited-verify", {})).status, 400);
      assert.equal((await post("/limited-verify", {})).status, 429);
      const originalEval = redis.eval;
      redis.eval = async () => {
        throw new Error("unavailable");
      };
      assert.equal((await post("/limited-verify", {})).status, 503);
      redis.eval = originalEval;
      const limited = await post("/signup", {});
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("retry-after"), "900");
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      if (mailQueue) await mailQueue.close();
      redis?.disconnect();
      if (repo) await repo.db.$client.end();
      await fixture.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
