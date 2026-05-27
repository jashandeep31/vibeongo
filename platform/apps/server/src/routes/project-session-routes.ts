import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getProjectSessionById,
  getUserProjectSessions,
  resumeProjectSession,
} from "../controllers/project-sessions/project-sessions.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserProjectSessions);
routes
  .route("/:id")
  .post(checkAuthorization(["all"]), resumeProjectSession)
  .get(checkAuthorization(["all"]), getProjectSessionById)
  .delete(checkAuthorization(["all"]));

export const projectSessionRoutes = routes;
