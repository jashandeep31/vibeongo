import { Router } from "express";
import { createProject } from "../controllers/project/create-project.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteProjectById,
  getProjectDomainsById,
  getProjectById,
  getProjects,
} from "../controllers/project/projects.js";
import {
  addAllowedIPToProject,
  deleteAllowedIPFromProject,
  updateProjectRoutingTargetInstance,
  updateProxyDomainPort,
} from "../controllers/project/project-domain.js";
import {
  createProjectFile,
  getProjectFiles,
} from "../controllers/project/project-files.js";

const routes: Router = Router();

routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);
routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getProjectById)
  .delete(checkAuthorization(["all"]), deleteProjectById);

routes
  .route("/:id/domains")
  .get(checkAuthorization(["all"]), getProjectDomainsById);
routes
  .route("/:id/domains/:domainId")
  .patch(checkAuthorization(["all"]), updateProxyDomainPort);
routes
  .route("/:id/routing/target-instance")
  .patch(checkAuthorization(["all"]), updateProjectRoutingTargetInstance);

routes
  .route("/:id/allowed-ips")
  .post(checkAuthorization(["all"]), addAllowedIPToProject);
routes
  .route("/:id/allowed-ips/:ipId")
  .delete(checkAuthorization(["all"]), deleteAllowedIPFromProject);

routes
  .route("/:id/project-files")
  .get(checkAuthorization(["all"]), getProjectFiles)
  .post(checkAuthorization(["all"]), createProjectFile);
routes.route("/:id/project-files/:fileId");
export const projectRoutes = routes;
