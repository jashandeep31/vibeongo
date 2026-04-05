import { Router } from "express";
import { getRuntimeSessionConfig } from "../controllers/runtime/get-runtime-session-config.js";

const routes: Router = Router();

routes.route("/sessions/:id/config").get(getRuntimeSessionConfig);

export const runtimeRoutes = routes;
