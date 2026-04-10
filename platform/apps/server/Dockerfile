# ---------- BASE ----------
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---------- PRUNE MONOREPO ----------
FROM base AS prepare
COPY . .
RUN pnpm dlx turbo prune server --docker



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
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./


WORKDIR /app/apps/server


CMD ["node", "dist/index.js"]
