import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import { issueSshTicket } from "../controllers/project-sessions/ssh-ticket-controller.js";
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
import { resumeSuspendedProjectSession } from "../controllers/project-sessions/resume-suspended-session.js";

const routes: Router = Router();

routes
  .route("/:id/ssh-ticket")
  .post(checkAuthorization(["user"]), issueSshTicket);

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
  .route("/:id/resume")
  .post(checkAuthorization(["user"]), resumeSuspendedProjectSession);

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
