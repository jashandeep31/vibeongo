import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  createGithubRepo,
  getUserGitRepos,
  deleteGithubRepo,
  updateGithubRepoById,
} from "../controlers/github-repo/github-repo-controller.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createGithubRepo)
  .get(checkAuthorization(["all"]), getUserGitRepos);

routes
  .route("/:id")
  .delete(checkAuthorization(["all"]), deleteGithubRepo)
  .post(checkAuthorization(["all"]), updateGithubRepoById);

export const githubRepoRoutes = routes;
