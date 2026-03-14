import { config, z } from "zod";

export const dockerConfigValidator = z.object({
  containers: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    }),
  ),
});

export const opencodeConfigValidator = z.object({
  auth_json: z.string(),
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
  sshKeys: z.array(z.string()),
  ports: z.array(
    z.object({
      port: z.number(),
      protocol: z.enum(["TCP", "UDP"]),
    }),
  ),

  repos: z.array(
    z.object({
      git_url: z.string(),
      access_token: z.string().optional(),
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
});
