export const tierLimits = {
  tier1: {
    manual: 2,
    auto: 1,
  },
  tier2: {
    manual: 5,
    auto: 2,
  },
  tier3: {
    manual: 10,
    auto: 5,
  },
} as const;

export const demoReposToFork = [
  {
    reponame: "todo-nextjs",
    ownername: "jashandeep31",
    description:
      "A simple Next.js todo app for trying the Vibeongo project workflow.",
    tags: ["Next.js", "TypeScript", "Todo"],
    project: {
      name: "todo-nextjs",
      description:
        "A simple Next.js todo app for trying the Vibeongo project workflow.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/todo-nextjs
npm i`,
      devScript: `cd /home/ubuntu/code/todo-nextjs
npm run dev`,
      config: {
        ports: [],
        packages: [
          {
            name: "docker",
            config: { containers: [] },
          },
          {
            name: "opencode",
            config: {
              auth_json: {},
              use_user_config: true,
              model: "",
            },
          },
          {
            name: "codex",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
          {
            name: "pi",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
        ],
      },
    },
  },
  {
    reponame: "vibeongo-url-shortner",
    ownername: "jashandeep31",
    description:
      "A TypeScript and Express URL shortener with PostgreSQL and Prisma.",
    tags: ["TypeScript", "Express", "PostgreSQL", "Prisma"],
    project: {
      name: "vibeongo-url",
      description:
        "A TypeScript and Express URL shortener with PostgreSQL and Prisma.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/vibeongo-url-shortner
npm install
npm run db:migrate
npm run build`,
      devScript: `cd /home/ubuntu/code/vibeongo-url-shortner
npm run dev`,
      config: {
        ports: [{ port: 3000, protocol: "TCP" }],
        packages: [
          {
            name: "docker",
            config: {
              containers: [
                {
                  name: "postgres",
                  dockercomposecode: `services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: url_shortner
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,
                },
              ],
            },
          },
          {
            name: "opencode",
            config: {
              auth_json: {},
              use_user_config: true,
              model: "default",
            },
          },
        ],
      },
    },
    files: [
      {
        name: ".env",
        path: "/vibeongo-url-shortner/.env",
        content: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/url_shortner
PORT=3000
BASE_URL=http://localhost:3000
`,
      },
    ],
  },
  {
    reponame: "brandmyphone-oss",
    ownername: "jashandeep31",
    description: "Next.js phone sticker sponsorship application.",
    tags: ["Next.js", "TypeScript", "Sponsorship"],
    project: {
      name: "brandmyphone-oss",
      description: "Next.js phone sticker sponsorship application.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/brandmyphone-oss
npm install`,
      devScript: `cd /home/ubuntu/code/brandmyphone-oss
npm run dev -- --hostname 0.0.0.0`,
      config: {
        ports: [{ port: 3000, protocol: "TCP" }],
        packages: [
          {
            name: "docker",
            config: { containers: [] },
          },
          {
            name: "opencode",
            config: {
              auth_json: {},
              use_user_config: true,
              model: "default",
            },
          },
          {
            name: "codex",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
          {
            name: "pi",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
          {
            name: "fx",
            config: {
              auth_json: {},
              use_user_config: true,
            },
          },
        ],
      },
    },
    files: [
      {
        name: ".env.local",
        path: "/brandmyphone-oss/.env.local",
        content: `NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PRODUCT_ID=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_HOST=https://us.i.posthog.com
CRON_SECRET=
`,
      },
    ],
  },
] as const;
