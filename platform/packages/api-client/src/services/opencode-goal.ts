import { z } from "zod";

// Portable Standard Schemas keep the Promise RPC usable on web and native
// without importing the upstream Effect schema implementation.
export const opencodeGoalSchema = z.object({
  id: z.string(),
  objective: z.string(),
  status: z.enum(["active", "paused", "complete"]),
  reason: z.string().optional(),
  rounds: z.number(),
  maxRounds: z.number(),
  updatedAt: z.number(),
});

export type OpencodeGoal = z.infer<typeof opencodeGoalSchema>;
export type OpencodeGoalAction = "pause" | "resume" | "clear";
export type OpencodeGoalConnection = {
  chatId: string;
  sessionId: string;
  serverUrl: string;
  accessToken: string;
  password?: string | undefined;
  directory: string;
};

export const opencodeGoalRpc = {
  id: "opencode.goal",
  methods: {
    get: {
      input: z.object({ sessionID: z.string() }),
      output: opencodeGoalSchema.nullable(),
    },
  },
  events: {
    changed: {
      schema: z.object({
        sessionID: z.string(),
        goal: opencodeGoalSchema.nullable(),
      }),
    },
  },
} as const;
