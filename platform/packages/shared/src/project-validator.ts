import { z } from "zod";

export const dockerConfigValidator = z.object({
  containers: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    }),
  ),
});

export const opencodeConfigValidator = z.object({
  auth_json: z.json(),
  model: z.string().default("default"),
  requirePassword: z.boolean().default(false),
});

export const tmuxConfigValidator = z.object({});

export const nodeConfigValidator = z.object({
  version: z.number(),
});

//TODO: make sure to check the git config url and show the error if it is not a valid git url
export const nvimConfigValidator = z.object({
  config_url: z
    .string()
    .default("https://github.com/nvim-lua/kickstart.nvim.git"),
});

export const projectConfigValidator = z.object({
  name: z.string(),
  description: z.string().optional(),
  regionId: z.uuid(),
  instanceTypeId: z.uuid(),
  sshKeyIds: z.array(z.uuid()),
  githubRepoIds: z.array(z.uuid()),

  initialScript: z.string().max(500),
  finalScript: z.string().max(500),
  devScript: z.string().max(500).default(""),

  config: z.object({
    ports: z.array(
      z.object({
        port: z.number(),
        protocol: z.enum(["TCP", "UDP"]),
      }),
    ),

    packages: z.array(
      z.discriminatedUnion("name", [
        z.object({
          name: z.literal("docker"),
          enabled: z.boolean(),
          config: dockerConfigValidator,
        }),

        z.object({
          name: z.literal("opencode"),
          enabled: z.boolean(),
          config: opencodeConfigValidator,
        }),
        z.object({
          name: z.literal("tmux"),
          enabled: z.boolean(),
          config: tmuxConfigValidator,
        }),
        z.object({
          name: z.literal("nvim"),
          enabled: z.boolean(),
          config: nvimConfigValidator,
        }),
        z.object({
          name: z.literal("nodejs"),
          enabled: z.boolean(),
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
