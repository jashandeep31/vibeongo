import { Router } from "express";
import { createProject } from "../controllers/project/create-project.js";
import {
  createProjectFromTemplate,
  getProjectTemplates,
} from "../controllers/project/create-project-from-template.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteProjectById,
  getProjectConfigForEdit,
  getProjectDomainsById,
  getProjectGithubReposById,
  getProjectById,
  getDemoProjects,
  getProjects,
  getProjectsWithSessions,
  importDemoProjects,
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
  .post(checkAuthorization(["user"]), createProject)
  .get(checkAuthorization(["user"]), getProjects);
routes
  .route("/from-template")
  .post(checkAuthorization(["user"]), createProjectFromTemplate);
routes
  .route("/templates")
  .get(checkAuthorization(["user"]), getProjectTemplates);
routes
  .route("/with-sessions")
  .get(checkAuthorization(["user"]), getProjectsWithSessions);
routes
  .route("/demo-projects")
  .get(checkAuthorization(["user"]), getDemoProjects);
routes
  .route("/demo-projects/import")
  .post(checkAuthorization(["user"]), importDemoProjects);
routes
  .route("/:id")
  .get(checkAuthorization(["user"]), getProjectById)
  .patch(checkAuthorization(["user"]), updateProjectById)
  .delete(checkAuthorization(["user"]), deleteProjectById);
routes
  .route("/:id/get-project-config")
  .get(checkAuthorization(["user"]), getProjectConfigForEdit);

routes
  .route("/:id/domains")
  .get(checkAuthorization(["user"]), getProjectDomainsById);
routes
  .route("/:id/github-repos")
  .get(checkAuthorization(["user"]), getProjectGithubReposById);
routes
  .route("/:id/domains/:domainId")
  .patch(checkAuthorization(["user"]), updateProxyDomain);
routes
  .route("/:id/routing/target-instance")
  .patch(checkAuthorization(["user"]), updateProjectRoutingTargetInstance);

routes
  .route("/:id/allowed-ips")
  .post(checkAuthorization(["user"]), addAllowedIPToProject);
routes
  .route("/:id/allowed-ips/:ipId")
  .delete(checkAuthorization(["user"]), deleteAllowedIPFromProject);

routes
  .route("/:id/allowed-ips")
  .delete(checkAuthorization(["user"]), deleteMultipleIpFromProject);

routes
  .route("/:id/project-files")
  .get(checkAuthorization(["user"]), getProjectFiles)
  .post(checkAuthorization(["user"]), createProjectFile);
routes
  .route("/:id/project-files/:fileId")
  .patch(checkAuthorization(["user"]), updateProjectFile)
  .delete(checkAuthorization(["user"]), deleteProjectFile);

export const projectRoutes = routes;
