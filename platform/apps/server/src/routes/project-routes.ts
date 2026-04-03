import { Router } from "express";
import { createProject } from "../controlers/project/create-project.js";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  deleteProjectById,
  getProjectById,
  getProjects,
} from "../controlers/project/projects.js";
import { getProjectConfigById } from "../controlers/project/get-project-config.js";

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
