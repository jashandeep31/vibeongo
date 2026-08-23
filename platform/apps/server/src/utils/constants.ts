export const tierLimits = {
  tier1: {
    manual: 2,
    auto: 1,
  },
  tier2: {
    manual: 3,
    auto: 2,
  },
  tier3: {
    manual: 3,
    auto: 2,
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
      provider: "aws",
      instanceTypeId: "f5cc34ea-e819-48f5-a858-8298e10e6754",
      sandboxTypeId: "a6617669-8424-472b-be1d-d5b95f3826dd",
      sshKeyIds: ["6834735d-a160-4095-800c-7d9e98f24ecc"],
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
              requirePassword: false,
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
      provider: "aws",
      instanceTypeId: "f5cc34ea-e819-48f5-a858-8298e10e6754",
      sandboxTypeId: "a6617669-8424-472b-be1d-d5b95f3826dd",
      sshKeyIds: ["6834735d-a160-4095-800c-7d9e98f24ecc"],
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
              requirePassword: false,
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
] as const;
