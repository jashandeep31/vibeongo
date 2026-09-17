import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createProjectAutomation,
  getProjectAutomations,
} from "../controllers/project-automations/manage-project-automation.js";

const routes: Router = Router();

routes
  .route("/")
  .get(checkAuthorization(["all"]), getProjectAutomations)
  .post(checkAuthorization(["all"]), createProjectAutomation);

export const projectAutomationRoutes = routes;
