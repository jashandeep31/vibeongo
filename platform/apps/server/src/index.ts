import express, { Request, Response } from "express";
import cors from "cors";
import test from "./test.js";
import { env } from "./lib/env.js";
import { testRoutes } from "./routes/test-routes.js";
import { authRoutes } from "./routes/auth-routes.js";
import { userRoutes } from "./routes/user-routes.js";
import { checkAuthorization } from "./lib/check-authorization.js";
import cookieParser from "cookie-parser";
import { projectRoutes } from "./routes/project-routes.js";
import { instanceMetadataRoutes } from "./routes/instance-metadata-routes.js";
import { miscellaneousRoutes } from "./routes/miscellaneous-routes.js";
import { instanceRoutes } from "./routes/instance-routes.js";
import { githubAppWebhookMiddleware } from "./webhooks/github/index.js";
import { githubRepoRoutes } from "./routes/github-repo-routes.js";
import { AppError } from "./lib/appError.js";
import { NextFunction } from "express";

const app = express();

// --- GitHub App Webhooks ---
// Must be before express.json()
app.use("/api/v1/github-app", githubAppWebhookMiddleware);

// --- App config ---
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [...env.ALLOWED_ORIGINS],
    credentials: true,
  }),
);

// --- Health Check Route (For dev purposes) ---
const START_TIME = Date.now();
app.get("/", checkAuthorization(["all"]), (_req: Request, res: Response) => {
  const diffMs = Date.now() - START_TIME;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  res.status(200).json({
    message: "Platform server is running",
    uptime: `${hours}h ${minutes}m ${seconds}s`,
  });
  return;
});

// --- Application Routes ---
app.use("/", miscellaneousRoutes);
app.use("/", testRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/instances", instanceRoutes);
app.use("/api/v1/instance-metadata", instanceMetadataRoutes);
app.use("/api/v1/github-repos", githubRepoRoutes);

// --- Global Error Handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.status;
    message = err.message;
  } else if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation Error";
  }

  res.status(statusCode).json({
    message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// --- Server ---
app.listen(env.PORT, () => {
  console.log(`Server is running at the port ${env.PORT}`);
});

if (env.NODE_ENV === "development") {
  test();
}
