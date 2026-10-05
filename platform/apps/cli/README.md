# Vibeongo CLI

Node.js and TypeScript CLI built with Commander.js. Requires Node.js 20 or newer.

From `platform/`, install workspace dependencies and run the source directly:

```bash
pnpm install
pnpm --filter @vibeongo/cli cli --help
pnpm --filter @vibeongo/cli cli version
pnpm --filter @vibeongo/cli cli --version
pnpm --filter @vibeongo/cli cli login
```

`login` is a sample command that prints `Login successful`. It does not authenticate,
make network requests, or store credentials. Running without arguments shows help.

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
```

Add future commands as modules in `src/commands/` and register them with
`program.addCommand()` in `src/cli.ts`. The version comes from `package.json`.
