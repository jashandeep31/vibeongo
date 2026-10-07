# Vibeongo CLI

Requires Node.js 20.17+, 22.13+, or 23.5+.

Create an API key in Vibeongo **Settings → API keys**, then log in:

```bash
npx @vibeongo/cli login
npx @vibeongo/cli status
```

API keys use the OS keyring by default. To save yours in a local JSON file instead:

```bash
npx @vibeongo/cli login --storage file
```

The file is at `~/.config/vibeongo/CLI/config.json` by default and contains the API key in plaintext.

Remove your saved local login:

```bash
npx @vibeongo/cli logout
```

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
npx @vibeongo/cli logout --server-url https://your-server.com
```

The default server is `https://server.vibeongo.com`.

```bash
npx @vibeongo/cli --help
npx @vibeongo/cli --version
```
