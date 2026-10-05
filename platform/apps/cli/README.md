# Vibeongo CLI

Requires Node.js 20.17+, 22.13+, or 23.5+.

Create an API key in Vibeongo **Settings → API keys**, then log in:

```bash
npx @vibeongo/cli login
npx @vibeongo/cli status
```

Your API key is saved in your OS credential store. On Linux, a running, unlocked Secret Service keyring is required.

Connect ChatGPT after logging in to Vibeongo:

```bash
npx @vibeongo/cli chatgpt login
```

Complete sign-in in your browser on the same computer. ChatGPT credentials are saved encrypted on the Vibeongo server.

For a custom server, use the same URL for each command:

```bash
npx @vibeongo/cli login --server-url https://your-server.com
npx @vibeongo/cli chatgpt login --server-url https://your-server.com
npx @vibeongo/cli status --server-url https://your-server.com
```

The default server is `https://server.vibeongo.com`.

```bash
npx @vibeongo/cli --help
npx @vibeongo/cli --version
```
