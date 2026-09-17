import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createProjectAutomation,
  getProjectAutomation,
  getProjectAutomations,
  updateProjectAutomation,
} from "../controllers/project-automations/manage-project-automation.js";
import { triggerProjectAutomationManually } from "../controllers/project-automations/trigger-project-automation.js";
import {
  getProjectAutomationRuns,
  rateProjectAutomationRun,
} from "../controllers/project-automations/project-automation-runs.js";

const routes: Router = Router();

routes
  .route("/")
  .get(checkAuthorization(["all"]), getProjectAutomations)
  .post(checkAuthorization(["all"]), createProjectAutomation);

routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getProjectAutomation)
  .patch(checkAuthorization(["all"]), updateProjectAutomation);

routes
  .route("/:id/runs")
  .get(checkAuthorization(["all"]), getProjectAutomationRuns);

routes
  .route("/:id/runs/:runId/rating")
  .patch(checkAuthorization(["all"]), rateProjectAutomationRun);

routes
  .route("/:id/trigger")
  .post(checkAuthorization(["all"]), triggerProjectAutomationManually);

export const projectAutomationRoutes = routes;
