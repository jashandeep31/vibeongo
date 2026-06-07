import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  addTaskToProjectSession,
  archiveProjectSession,
  getProjectSessionById,
  getUserProjectSessions,
  resumeProjectSession,
} from "../controllers/project-sessions/project-sessions.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserProjectSessions);
routes
  .route("/:id")
  .post(checkAuthorization(["all"]), resumeProjectSession)
  .get(checkAuthorization(["all"]), getProjectSessionById);
// .delete(checkAuthorization(["all"]), archiveProjectSession);

routes
  .route("/:id/archive")
  .post(checkAuthorization(["all"]), archiveProjectSession);

routes
  .route("/:id/tasks")
  .post(checkAuthorization(["all"]), addTaskToProjectSession);
export const projectSessionRoutes = routes;
