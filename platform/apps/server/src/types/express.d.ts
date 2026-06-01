import { sessionAuthTokens, users } from "@repo/db";

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
      sessionToken?: typeof sessionAuthTokens.$inferSelect;
    }
  }
}
