import { Router } from "express";
import { getProjectSessionConfig } from "../controllers/project-sessions/get-project-session-config.js";

const routes: Router = Router();

routes.route("/:id/config").get(getProjectSessionConfig);
export const projectSessionRoutes = routes;
