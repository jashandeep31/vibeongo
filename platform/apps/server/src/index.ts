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

// app config
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [...env.ALLOWED_ORIGINS],
    credentials: true,
  }),
);

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
});

// routes of application
app.use("/", miscellaneousRoutes);
app.use("/", testRoutes);
app.use("/api/v1", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/project", projectRoutes);
app.use("/api/v1/instance-metadata", instanceMetadataRoutes);

app.listen(env.PORT, () => {
  console.log(`Server is running at the port ${env.PORT}`);
});

if (env.NODE_ENV === "development") {
  test();
}

// TODO: tasks i wanna do
// 1. create a ec2 by the route hitting of this project
// 2. make ist small vms per the requirements of the user
// 3. install the user setup in it and our own core plugin to handle to make instance a server
