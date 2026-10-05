# Vibeongo CLI

Node.js and TypeScript CLI built with Commander.js. Requires Node.js 20.17+, 22.13+,
or 23.5+ (including newer releases).

From `platform/`, install workspace dependencies and run the source directly:

```bash
pnpm install
pnpm --filter @vibeongo/cli cli --help
pnpm --filter @vibeongo/cli cli version
pnpm --filter @vibeongo/cli cli --version
pnpm --filter @vibeongo/cli cli login
pnpm --filter @vibeongo/cli cli status
```

Running without arguments shows help.

## Login

Create a Vibeongo API key in the web app's Settings → API keys. Then run:

```bash
pnpm --filter @vibeongo/cli cli login
```

Enter the key at the masked prompt. The CLI validates it with
`GET http://localhost:8000/api/v1/users/metadata`, saves the key only after
successful validation, and prints an account summary without the account ID. It never prints
the key or accepts it as a command-line argument. Ctrl+C cancels the prompt.

For a local server:

```bash
pnpm --filter @vibeongo/cli cli login --server-url http://127.0.0.1:3001
```

The default server is hardcoded to `http://localhost:8000` for now.
Use `--server-url` to override it.

Remote servers require HTTPS. HTTP is accepted only for loopback development.
The metadata request times out after ten seconds and does not follow redirects.

Credentials use `@napi-rs/keyring`, with the service name `com.vibeongo.cli` and
the server origin as the account identifier. Logging in again replaces the saved
key for that server only. Future commands can use `getApiKey()` from
`src/lib/credential-store.ts`.

- macOS: Keychain.
- Windows: Credential Manager.
- Linux: Secret Service, such as GNOME Keyring or KWallet, must be installed,
  running, and unlocked. The CLI pins this persistent backend rather than falling
  back to the kernel's temporary keyring.

If the OS store is unavailable or locked, login fails. No key is saved in a plaintext
file, environment file, or CLI configuration file. The login command requires an
interactive terminal.

## Status

Check which account is logged in:

```bash
pnpm --filter @vibeongo/cli cli status
```

`status` reads the saved API key from the OS credential store and fetches current
user metadata, then shows the account summary without the account ID. It does not prompt
for a key or modify credentials. If no key is saved, it asks you to run `vibeongo login`.
Rejected keys, server errors, and unavailable credential stores return an error
and a nonzero exit code instead of reporting a successful login.

Use the same `--server-url` as login when checking a different server.

## ChatGPT sign-in

```bash
pnpm --filter @vibeongo/cli cli login
pnpm --filter @vibeongo/cli cli chatgpt login
```

Log in to Vibeongo first. ChatGPT sign-in reads the saved Vibeongo API key and
validates it before opening the browser. After verifying the ChatGPT response,
it sends the credentials and issued client ID to
`PUT http://localhost:8000/api/v1/users/provider-credentials/codex`.
The server encrypts the credentials and creates or replaces your Codex connection,
with access expiry of one hour and refresh expiry of 30 days from saving.
Use the same `--server-url` for both login commands to select a different server.
If saving fails, the command exits with an error instead of reporting success.

This opens Continue with ChatGPT in your default browser. The CLI listens on
`http://127.0.0.1:3102/auth/callback`; if that port is occupied, it tries 3103,
3104, and so on. If the browser cannot open, sign-in fails.
Run the CLI on the same computer as the browser receiving the loopback callback.
Sign-in expires after five minutes; Ctrl+C cancels it and closes the listener.

The first sign-in uses OpenAI's `dynamic_agent_client` registration flow with
`agent_name_hint=Vibeongo`. Later sign-ins reuse the issued client ID for the last
selected account. Host IDs and verified client/account registrations are kept in
the OS keyring, separate from the Vibeongo API key.

```bash
# Register a different ChatGPT account or workspace
pnpm --filter @vibeongo/cli cli chatgpt login --new-account

# Select a previously saved registration
pnpm --filter @vibeongo/cli cli chatgpt login --client-id oaiapp_YOUR_CLIENT_ID
```

The requested scopes are `openid profile email offline_access resource.invoke
chatgpt.tokens.use.direct`. The flow checks state and PKCE, verifies the ID token
against OpenAI's discovered JWKS, and checks the granted scopes before reporting
ChatGPT plan usage as enabled. Permission depends on the user's approval and
OpenAI account/workspace eligibility; the command does not make inference requests
or spend credits.

The CLI prints only `ChatGPT sign-in successful`, including the account name when
available, or `ChatGPT sign-in failed.` It does not print tokens, authorization
URLs, response headers, or account claims. Tokens are saved encrypted on the
Vibeongo server; they are not saved to local files or the OS keyring. The browser
callback page contains no tokens.

Official reference: https://developers.openai.com/siwc/token-sharing-open-source/sign-in

Build and run the JavaScript output:

```bash
pnpm --filter @vibeongo/cli build
pnpm --filter @vibeongo/cli start --help
pnpm --filter @vibeongo/cli start login
```

For a local `vibeongo` executable, build first, then run `npm link` from
`platform/apps/cli`. The package is private while this scaffold is being developed.

Development and checks:

```bash
pnpm --filter @vibeongo/cli dev
pnpm --filter @vibeongo/cli check-types
pnpm --filter @vibeongo/cli lint
pnpm --filter @vibeongo/cli test
```

Add future commands as modules in `src/commands/` and register them with
`program.addCommand()` in `src/cli.ts`. The version comes from `package.json`.
