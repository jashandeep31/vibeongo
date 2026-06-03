import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createGithubRepo,
  getUserGitRepos,
  deleteGithubRepo,
  updateGithubRepoById,
  getGithubRepoById,
} from "../controllers/github-repo/github-repo-controller.js";
import { workOnIssueByIssueId } from "../controllers/github-repo/work-on-issue.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createGithubRepo)
  .get(checkAuthorization(["all"]), getUserGitRepos);

routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getGithubRepoById)
  .delete(checkAuthorization(["all"]), deleteGithubRepo)
  .post(checkAuthorization(["all"]), updateGithubRepoById);

routes
  .route("/:id/issue/:issueNumber")
  .post(checkAuthorization(["all"]), workOnIssueByIssueId);

export const githubRepoRoutes = routes;
