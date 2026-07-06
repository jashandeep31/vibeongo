import { instances, users } from "@repo/db";

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
      runtimeInstance?: typeof instances.$inferSelect;
    }
  }
}
