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
    reponame: "portfolio",
    ownername: "vibeongo",
    description: "A Next.js portfolio website.",
    tags: ["Next.js", "TypeScript", "Portfolio"],
    project: {
      name: "portfolio",
      description: "A Next.js portfolio website.",
      initialScript: "",
      finalScript: `cd "$HOME/code/portfolio"
npm install`,
      devScript: `cd "$HOME/code/portfolio"
npm run dev`,
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
  },
  {
    reponame: "blogging-website",
    ownername: "vibeongo",
    description: "A Next.js blogging website backed by PostgreSQL and Drizzle.",
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Drizzle"],
    project: {
      name: "blogging-website",
      description:
        "A Next.js blogging website backed by PostgreSQL and Drizzle.",
      initialScript: "",
      finalScript: `cd "$HOME/code/blogging-website"
npm install
npm run db:migrate
npm run db:seed
`,
      devScript: `cd "$HOME/code/blogging-website"
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
      POSTGRES_DB: default
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
        name: ".env",
        path: "/blogging-website",
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/default\n",
      },
    ],
  },
  {
    reponame: "env-manager",
    ownername: "vibeongo",
    description: "A Next.js tool for comparing environment variable files.",
    tags: ["Next.js", "TypeScript", "Environment Variables"],
    project: {
      name: "env-manager",
      description: "A Next.js tool for comparing environment variable files.",
      initialScript: "",
      finalScript: `cd "$HOME/code/env-manager"
npm install`,
      devScript: `cd "$HOME/code/env-manager"
npm run dev`,
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
  },
] as const;
