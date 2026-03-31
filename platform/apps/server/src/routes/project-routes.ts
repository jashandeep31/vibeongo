import { Router } from "express";
import { createProject } from "../controlers/project/create-project.js";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  getProjectById,
  getProjects,
} from "../controlers/project/get-projects.js";
import { getProjectConfigById } from "../controlers/project/get-project-config.js";

const routes: Router = Router();

routes.route("/:id").get(checkAuthorization(["all"]), getProjectById);
routes.route("/:id/config").get(getProjectConfigById);

routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);

export const projectRoutes = routes;
