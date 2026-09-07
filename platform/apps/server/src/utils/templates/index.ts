import type { projectConfigValidator, z } from "@repo/shared";

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
  envFiles: { path: string; content: string }[];
}

export const projectTemplates: Record<
  string,
  (repoName: string) => ProjectTemplate
> = {
  "next-js-project": (repoName: string) => ({
    ownername: "jashandeep31",
    reponame: "next-js-project",
    project: {
      name: "todo-nextjs",
      description: "A preconfigured Next.js todo application.",
      initialScript: "",
      finalScript: `cd /home/ubuntu/code/${repoName}
npm install`,
      devScript: `cd /home/ubuntu/code/${repoName}
npm run dev`,
      config: {
        ports: [{ port: 3000, protocol: "TCP" }],
      },
    },
    envFiles: [],
  }),
};
