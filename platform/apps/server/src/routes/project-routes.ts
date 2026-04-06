import { Router } from "express";
import { createProject } from "../controllers/project/create-project.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteProjectById,
  getProjectById,
  getProjects,
} from "../controllers/project/projects.js";

const routes: Router = Router();

routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getProjectById)
  .delete(checkAuthorization(["all"]), deleteProjectById);

routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);

export const projectRoutes = routes;
