import * as Sentry from "@sentry/node";
import { env } from "./env.js";

Sentry.init({
  dsn: env.NODE_ENV === "production" ? env.DSN : undefined,
  environment: env.NODE_ENV,
  // Add Tracing by setting tracesSampleRate
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
