import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getUserProjectSessions,
  resumeProjectSession,
} from "../controllers/project-sessions/project-sessions.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserProjectSessions);
routes.route("/:id").post(checkAuthorization(["all"]), resumeProjectSession);

export const projectSessionRoutes = routes;
