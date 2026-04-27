import { Router } from "express";
import { getRuntimeSessionConfig } from "../controllers/runtime/get-runtime-session-config.js";
import { checkRuntimeAuthorization } from "../middlewares/check-runtime-authorization.js";
import { getRuntimeProjectFiles } from "../controllers/runtime/get-projects-files.js";

const routes: Router = Router();

routes
  .route("/sessions/:id/config")
  .get(checkRuntimeAuthorization, getRuntimeSessionConfig);

routes.route("/sessions/:id/stop/:instanceId").get(checkRuntimeAuthorization);
routes
  .route("/sessions/:id/get-project-files")
  .get(checkRuntimeAuthorization, getRuntimeProjectFiles);
export const runtimeRoutes = routes;
