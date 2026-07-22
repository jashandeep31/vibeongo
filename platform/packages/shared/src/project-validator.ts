import { z } from "zod";

export const dockerConfigValidator = z.object({
  containers: z.array(
    z.object({
      name: z.string(),
      dockercomposecode: z.string(),
    }),
  ),
});

export const opencodeConfigValidator = z.object({
  auth_json: z.json(),
  model: z.string().default("default"),
  requirePassword: z.boolean().default(false),
});

export const piConfigValidator = z.object({
  auth_json: z.json(),
});

export const codexConfigValidator = z.object({
  auth_json: z.json(),
});

export const tmuxConfigValidator = z.object({});

export const nodeConfigValidator = z.object({
  version: z.number(),
});

export const projectProviderValidator = z.enum(["aws", "digitalocean"]);
export type ProjectProvider = z.infer<typeof projectProviderValidator>;

//TODO: make sure to check the git config url and show the error if it is not a valid git url
export const nvimConfigValidator = z.object({
  config_url: z
    .string()
    .default("https://github.com/nvim-lua/kickstart.nvim.git"),
});

export const projectConfigValidator = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Project name must be at least 3 characters")
    .max(20, "Project name must be at most 20 characters"),
  description: z.string().optional(),
  provider: projectProviderValidator,
  regionId: z.uuid("Select a deployment region"),
  instanceTypeId: z.uuid("Select an instance type"),
  sandboxTypeId: z.uuid("Select an sandbox type").nullable().optional(),
  sshKeyIds: z.array(z.uuid()),
  githubRepoIds: z.array(z.uuid()),

  initialScript: z
    .string()
    .max(500, "Initial script must be at most 500 characters"),
  finalScript: z
    .string()
    .max(500, "Final script must be at most 500 characters"),
  devScript: z
    .string()
    .max(500, "Dev script must be at most 500 characters")
    .default(""),

  config: z.object({
    ports: z.array(
      z.object({
        port: z
          .number()
          .int("Port must be a whole number")
          .min(1, "Port must be between 1 and 65535")
          .max(65535, "Port must be between 1 and 65535"),
        protocol: z.enum(["TCP", "UDP"]),
      }),
    ),

    packages: z.array(
      z.discriminatedUnion("name", [
        z.object({
          name: z.literal("docker"),
          config: dockerConfigValidator,
        }),

        z.object({
          name: z.literal("opencode"),
          config: opencodeConfigValidator,
        }),

        z.object({
          name: z.literal("codex"),
          config: codexConfigValidator,
        }),
        z.object({
          name: z.literal("pi"),
          config: piConfigValidator,
        }),
        z.object({
          name: z.literal("tmux"),
          config: tmuxConfigValidator,
        }),
        z.object({
          name: z.literal("nvim"),
          config: nvimConfigValidator,
        }),
        z.object({
          name: z.literal("nodejs"),
          config: nodeConfigValidator,
        }),
      ]),
    ),
  }),
});

export const projectSessionTaskSchema = z.object({
  task: z.string().trim().min(1, "Task description is required"),
  model: z.string().trim(),
  agent: z.enum(["build", "plan", "issue-resolver", "pr-reviewer"]),
  repoId: z.uuid("Repository id must be valid"),
});

export const updateProjectSessionTaskSchema = projectSessionTaskSchema.extend({
  done: z.boolean(),
});

export const createInstanceSchema = z.object({
  projectId: z.uuid("Project id must be valid"),
  sessionName: z
    .string()
    .min(4, "Session name must be at least 4 characters long"),
  sessionDescription: z.string().optional(),
  tasks: z.array(projectSessionTaskSchema),
});
