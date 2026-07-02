import { Router } from "express";
import { createProject } from "../controllers/project/create-project.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteProjectById,
  getProjectConfigForEdit,
  getProjectDomainsById,
  getProjectById,
  getProjects,
  updateProjectById,
} from "../controllers/project/projects.js";
import {
  addAllowedIPToProject,
  deleteAllowedIPFromProject,
  deleteMultipleIpFromProject,
  updateProjectRoutingTargetInstance,
  updateProxyDomain,
} from "../controllers/project/project-domain.js";
import {
  createProjectFile,
  deleteProjectFile,
  getProjectFiles,
  updateProjectFile,
} from "../controllers/project/project-files.js";

const routes: Router = Router();

routes
  .route("/")
  .post(checkAuthorization(["all"]), createProject)
  .get(checkAuthorization(["all"]), getProjects);
routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getProjectById)
  .patch(checkAuthorization(["all"]), updateProjectById)
  .delete(checkAuthorization(["all"]), deleteProjectById);
routes
  .route("/:id/get-project-config")
  .get(checkAuthorization(["all"]), getProjectConfigForEdit);

routes
  .route("/:id/domains")
  .get(checkAuthorization(["all"]), getProjectDomainsById);
routes
  .route("/:id/domains/:domainId")
  .patch(checkAuthorization(["all"]), updateProxyDomain);
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
  .route("/:id/allowed-ips")
  .delete(checkAuthorization(["all"]), deleteMultipleIpFromProject);

routes
  .route("/:id/project-files")
  .get(checkAuthorization(["all"]), getProjectFiles)
  .post(checkAuthorization(["all"]), createProjectFile);
routes
  .route("/:id/project-files/:fileId")
  .patch(checkAuthorization(["all"]), updateProjectFile)
  .delete(checkAuthorization(["all"]), deleteProjectFile);

export const projectRoutes = routes;
