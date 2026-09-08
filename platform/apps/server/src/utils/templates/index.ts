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
  "next-js-project": (repoName: string) => ({
    ownername: "jashandeep31",
    reponame: "next-js-project",
    project: {
      name: "basic-nextjs-project",
      description: "A bare-minimum Next.js app with PostgreSQL ready to use.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/${repoName}
npm install`,
      devScript: `cd /home/ubuntu/code/${repoName}
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
  "next-js-express-project": (repoName: string) => ({
    ownername: "jashandeep31",
    reponame: "next-js-express-project",
    project: {
      name: "nextjs-express-project",
      description:
        "A full-stack TypeScript project with Next.js and Express applications.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/${repoName}/frontend
npm install
cd ../backend
npm install`,
      devScript: `cd /home/ubuntu/code/${repoName}
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
  "turborepo-project": (repoName: string) => ({
    ownername: "jashandeep31",
    reponame: "turborepo-project",
    project: {
      name: "turborepo-project",
      description:
        "A Turborepo workspace with Next.js web and documentation applications.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/${repoName}
pnpm install`,
      devScript: `cd /home/ubuntu/code/${repoName}
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
