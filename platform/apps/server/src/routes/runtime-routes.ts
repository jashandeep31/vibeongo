import { Router } from "express";
import { getRuntimeSessionConfig } from "../controllers/runtime/get-runtime-session-config.js";
import { checkRuntimeAuthorization } from "../middlewares/check-runtime-authorization.js";

const routes: Router = Router();

routes
  .route("/sessions/:id/config")
  .get(checkRuntimeAuthorization, getRuntimeSessionConfig);

export const runtimeRoutes = routes;
