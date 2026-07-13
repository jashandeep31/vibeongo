import { Router } from "express";
import {
  getSessionDomains,
  getRuntimeSessionConfig,
} from "../controllers/runtime/get-runtime-session-config.js";
import { checkRuntimeAuthorization } from "../middlewares/check-runtime-authorization.js";
import { getRuntimeProjectFiles } from "../controllers/runtime/get-projects-files.js";
import {
  getSessionOverview,
  updateSessionOverview,
} from "../controllers/runtime/session-overview.js";
import { suspendSessionInstance } from "../controllers/runtime/suspend-session-instance.js";
import { runTaskActions } from "../controllers/runtime/task-actions.js";
import { renewTokens } from "../controllers/runtime/renew-tokens.js";
import { updateRuntimeProjectBasicConfig } from "../controllers/runtime/update-project-config.js";

const routes: Router = Router();

routes
  .route("/sessions/:id/config/:instanceId")
  .get(checkRuntimeAuthorization, getRuntimeSessionConfig)
  .post(checkRuntimeAuthorization, updateRuntimeProjectBasicConfig);

routes
  .route("/sessions/:id/terminate/:instanceId")
  .get(checkRuntimeAuthorization, suspendSessionInstance);

routes
  .route("/sessions/:id/get-project-files")
  .get(checkRuntimeAuthorization, getRuntimeProjectFiles);

routes
  .route("/sessions/:id/overview")
  .get(checkRuntimeAuthorization, getSessionOverview)
  .post(checkRuntimeAuthorization, updateSessionOverview);

routes
  .route("/sessions/:id/tasks/:taskId")
  .post(checkRuntimeAuthorization, runTaskActions);

routes
  .route("/sessions/:id/renew-tokens/:instanceId")
  .get(checkRuntimeAuthorization, renewTokens);

routes
  .route("/sessions/:id/get-domains")
  .get(checkRuntimeAuthorization, getSessionDomains);

export const runtimeRoutes = routes;
