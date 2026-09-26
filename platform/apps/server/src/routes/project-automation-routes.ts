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
import { deleteProjectAutomationTrigger } from "../controllers/project-automations/delete-project-automation-trigger.js";
import {
  getProjectAutomationRuns,
  rateProjectAutomationRun,
} from "../controllers/project-automations/project-automation-runs.js";

const routes: Router = Router();

routes
  .route("/")
  .get(checkAuthorization(["user"]), getProjectAutomations)
  .post(checkAuthorization(["user"]), createProjectAutomation);

routes
  .route("/:id")
  .get(checkAuthorization(["user"]), getProjectAutomation)
  .patch(checkAuthorization(["user"]), updateProjectAutomation)
  .delete(checkAuthorization(["user"]), deleteProjectAutomation);

routes
  .route("/:id/runs")
  .get(checkAuthorization(["user"]), getProjectAutomationRuns);

routes
  .route("/:id/runs/:runId/rating")
  .patch(checkAuthorization(["user"]), rateProjectAutomationRun);

routes
  .route("/:id/trigger")
  .post(checkAuthorization(["user"]), triggerProjectAutomationManually);

routes
  .route("/:id/triggers")
  .get(checkAuthorization(["user"]), getProjectAutomationTriggers)
  .post(checkAuthorization(["user"]), createProjectAutomationTrigger);

routes
  .route("/:id/triggers/:triggerId/rotate-token")
  .post(checkAuthorization(["user"]), rotateProjectAutomationTriggerToken);

routes
  .route("/:id/triggers/:triggerId")
  .get(checkAuthorization(["user"]), getProjectAutomationTrigger)
  .delete(checkAuthorization(["user"]), deleteProjectAutomationTrigger);

export const projectAutomationRoutes = routes;
