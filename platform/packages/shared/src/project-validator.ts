import { config, z } from "zod";

export const dockerConfigValidator = z.object({
  containers: z.array(
    z.object({
      name: z.string(),
      filename: z.string(),
      //NOTE: while creating the project we are getting the file_content not the file_url but when we will run the bootstrap script it should have to be provideed a url
      file_content: z.string(),
    }),
  ),
});

export const opencodeConfigValidator = z.object({
  command: z.string(),
});

export const tmuxConfigValidator = z.object({});

export const neovimConfigValidator = z.object({
  config_url: z
    .string()
    .default("https://github.com/nvim-lua/kickstart.nvim.git"),
});

export const projectConfigValidator = z.object({
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
        name: z.literal("tmux"),
        config: tmuxConfigValidator,
      }),
    ]),
  ),
});
