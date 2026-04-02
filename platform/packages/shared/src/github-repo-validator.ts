import { z } from "zod";

export const createGithubRepoSchema = z.object({
  url: z.url(),
});
