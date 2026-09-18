import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createProjectAutomation,
  deleteProjectAutomation,
  getProjectAutomation,
  getProjectAutomations,
  updateProjectAutomation,
} from "../controllers/project-automations/manage-project-automation.js";
import {
  rotateProjectAutomationTriggerToken,
  triggerProjectAutomationManually,
} from "../controllers/project-automations/trigger-project-automation.js";
import { createProjectAutomationTrigger } from "../controllers/project-automations/create-project-automation-trigger.js";
import { getProjectAutomationTriggers } from "../controllers/project-automations/get-project-automation-triggers.js";
import { getProjectAutomationTrigger } from "../controllers/project-automations/get-project-automation-trigger.js";
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
  .patch(checkAuthorization(["all"]), updateProjectAutomation)
  .delete(checkAuthorization(["all"]), deleteProjectAutomation);

routes
  .route("/:id/runs")
  .get(checkAuthorization(["all"]), getProjectAutomationRuns);

routes
  .route("/:id/runs/:runId/rating")
  .patch(checkAuthorization(["all"]), rateProjectAutomationRun);

routes
  .route("/:id/trigger")
  .post(checkAuthorization(["all"]), triggerProjectAutomationManually);

routes
  .route("/:id/triggers")
  .get(checkAuthorization(["all"]), getProjectAutomationTriggers)
  .post(checkAuthorization(["all"]), createProjectAutomationTrigger);

routes
  .route("/:id/triggers/:triggerId/rotate-token")
  .post(checkAuthorization(["all"]), rotateProjectAutomationTriggerToken);

routes
  .route("/:id/triggers/:triggerId")
  .get(checkAuthorization(["all"]), getProjectAutomationTrigger);

export const projectAutomationRoutes = routes;
