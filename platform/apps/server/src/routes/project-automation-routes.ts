import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createProjectAutomation,
  getProjectAutomation,
  getProjectAutomations,
} from "../controllers/project-automations/manage-project-automation.js";
import { triggerProjectAutomationManually } from "../controllers/project-automations/trigger-project-automation.js";

const routes: Router = Router();

routes
  .route("/")
  .get(checkAuthorization(["all"]), getProjectAutomations)
  .post(checkAuthorization(["all"]), createProjectAutomation);

routes.route("/:id").get(checkAuthorization(["all"]), getProjectAutomation);

routes
  .route("/:id/trigger")
  .post(checkAuthorization(["all"]), triggerProjectAutomationManually);

export const projectAutomationRoutes = routes;
