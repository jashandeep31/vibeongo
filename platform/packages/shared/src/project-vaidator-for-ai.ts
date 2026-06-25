import { z } from "zod";

export const projectValidatorForAIInput = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  regionId: z.uuid().optional(),
  instanceTypeId: z.uuid().optional(),
  sshKeyIds: z.array(z.uuid()).optional(),
  githubRepoIds: z.array(z.uuid()),

  initialScript: z.string().max(500).optional(),
  finalScript: z.string().max(500).optional(),
  devScript: z.string().max(500).default("").optional(),
});
