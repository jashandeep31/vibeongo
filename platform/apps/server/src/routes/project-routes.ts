import { Router } from "express";
import { createProject } from "../controllers/project/create-project.js";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  deleteProjectById,
  getProjectById,
  getProjects,
} from "../controllers/project/projects.js";
import { getProjectConfigById } from "../controllers/project/get-project-config.js";

import { checkApiAuthorization } from "../lib/check-api-authorization.js";

const routes: Router = Router();

routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getProjectById)
  .delete(checkAuthorization(["all"]), deleteProjectById);
routes
  .route("/:id/config")
  .get(checkApiAuthorization(["all"]), getProjectConfigById);

routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);

export const projectRoutes = routes;
