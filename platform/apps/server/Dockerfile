# ---------- BASE ----------
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---------- PRUNE MONOREPO ----------
FROM base AS prepare
COPY . .
RUN pnpm dlx turbo@2.11.10 prune server --docker



# ---------- INSTALL + BUILD ----------
FROM base AS builder

COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=prepare /app/out/full/ .
RUN pnpm turbo build
RUN find /app -type d -name "node_modules" -prune -exec rm -rf '{}' +

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ---------- RUNTIME ----------
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./


WORKDIR /app/apps/server


CMD ["node", "dist/index.js"]
