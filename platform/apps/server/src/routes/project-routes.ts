import { Router } from "express";
import { createProject } from "../controlers/project/create-project.js";
import { checkAuthorization } from "../lib/check-authorization.js";
import { getProjects } from "../controlers/project/get-projects.js";

const routes: Router = Router();

routes.route("/:id");
routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);

export const projectRoutes = routes;
