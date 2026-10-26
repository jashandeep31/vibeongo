import type {
  dockerConfigValidator,
  projectConfigValidator,
  z,
} from "@repo/shared";

type TemplateProjectConfig = Omit<
  z.input<typeof projectConfigValidator>,
  | "provider"
  | "regionId"
  | "instanceTypeId"
  | "sandboxTypeId"
  | "sshKeyIds"
  | "githubRepoIds"
>;

export interface ProjectTemplate {
  ownername: string;
  reponame: string;
  project: TemplateProjectConfig;
  dockerContainers?: z.input<typeof dockerConfigValidator>["containers"];
  envFiles: { name: string; path: string; content: string }[];
}

export const projectTemplates: Record<
  string,
  (repoName: string) => ProjectTemplate
> = {
  "nextjs": (repoName: string) => ({
    ownername: "vibeongo",
    reponame: "nextjs",
    project: {
      name: "Next.js",
      description: "A bare-minimum Next.js app with PostgreSQL ready to use.",
      initialScript: "",
      finalScript: `cd "$HOME/workspace/${repoName}"
npm install`,
      devScript: `cd "$HOME/workspace/${repoName}"
npm run dev`,
      config: {
        ports: [{ port: 3000, protocol: "TCP" }],
      },
    },
    dockerContainers: [
      {
        name: "postgres",
        dockercomposecode: `services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,
      },
    ],
    envFiles: [
      {
        name: ".env",
        path: `/${repoName}`,
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app\n",
      },
    ],
  }),
  "express-vite": (repoName: string) => ({
    ownername: "vibeongo",
    reponame: "express-vite",
    project: {
      name: "Express + Vite",
      description:
        "A full-stack TypeScript project with Express and Vite applications.",
      initialScript: "",
      finalScript: `cd "$HOME/workspace/${repoName}/frontend"
npm install
cd ../backend
npm install`,
      devScript: `cd "$HOME/workspace/${repoName}"
npm run dev --prefix frontend & npm run dev --prefix backend & wait`,
      config: {
        ports: [
          { port: 3000, protocol: "TCP" },
          { port: 4000, protocol: "TCP" },
        ],
      },
    },
    dockerContainers: [
      {
        name: "postgres",
        dockercomposecode: `services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,
      },
    ],
    envFiles: [
      {
        name: ".env",
        path: `/${repoName}/frontend`,
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app\n",
      },
      {
        name: ".env",
        path: `/${repoName}/backend`,
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app\n",
      },
    ],
  }),
  "turbo-repo": (repoName: string) => ({
    ownername: "vibeongo",
    reponame: "turbo-repo",
    project: {
      name: "Turborepo",
      description:
        "A Turborepo workspace with Next.js web and documentation applications.",
      initialScript: "",
      finalScript: `cd "$HOME/workspace/${repoName}"
pnpm install`,
      devScript: `cd "$HOME/workspace/${repoName}"
pnpm dev`,
      config: {
        ports: [
          { port: 3000, protocol: "TCP" },
          { port: 3001, protocol: "TCP" },
        ],
      },
    },
    dockerContainers: [
      {
        name: "postgres",
        dockercomposecode: `services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`,
      },
    ],
    envFiles: [
      {
        name: ".env",
        path: `/${repoName}/apps/web`,
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app\n",
      },
      {
        name: ".env",
        path: `/${repoName}/apps/docs`,
        content:
          "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app\n",
      },
    ],
  }),
};
