import { users } from "@repo/db";

declare global {
  namespace Express {
    interface Request {
      user?: users.$inferSelect;
    }
  }
}
