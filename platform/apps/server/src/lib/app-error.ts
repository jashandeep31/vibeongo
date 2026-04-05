import { env } from "./env.js";

export class AppError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    if (env.NODE_ENV === "development") {
      console.log(this.stack);
    }
  }
}
