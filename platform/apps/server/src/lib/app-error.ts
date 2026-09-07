import { env } from "./env.js";

export class AppError extends Error {
  status: number;
  reportToSentry: boolean;

  constructor(
    message: string,
    status: number,
    options: { reportToSentry?: boolean } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.reportToSentry = options.reportToSentry ?? status >= 500;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    if (env.NODE_ENV === "development") {
      console.log(this.stack);
    }
  }
}
