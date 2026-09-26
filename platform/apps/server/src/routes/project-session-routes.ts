import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  addTaskToProjectSession,
  archiveProjectSession,
  createProjectSession,
  deleteProjectSessionTask,
  getProjectSessionById,
  getUserProjectSessions,
  resumeProjectSession,
  updateProjectSessionTask,
} from "../controllers/project-sessions/project-sessions.js";

const routes: Router = Router();

routes
  .route("/")
  .get(checkAuthorization(["user"]), getUserProjectSessions)
  .post(checkAuthorization(["user"]), createProjectSession);
routes
  .route("/:id")
  .post(checkAuthorization(["user"]), resumeProjectSession)
  .get(checkAuthorization(["user"]), getProjectSessionById);
// .delete(checkAuthorization(["user"]), archiveProjectSession);

routes
  .route("/:id/archive")
  .post(checkAuthorization(["user"]), archiveProjectSession);

routes
  .route("/:id/tasks")
  .post(checkAuthorization(["user"]), addTaskToProjectSession);
routes
  .route("/:id/tasks/:taskId")
  .patch(checkAuthorization(["user"]), updateProjectSessionTask)
  .delete(checkAuthorization(["user"]), deleteProjectSessionTask);
export const projectSessionRoutes = routes;
