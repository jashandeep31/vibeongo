import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createGithubRepo,
  getUserGitRepos,
  deleteGithubRepo,
  updateGithubRepoById,
  getGitRepoById,
  createForgejoRepoController,
} from "../controllers/github-repo/git-repo-controller.js";
import { workOnIssueByIssueId } from "../controllers/github-repo/work-on-issue.js";
import { workOnPullRequestByPrNumber } from "../controllers/github-repo/work-on-pullrequest.js";
import { createGithubRepoOverviewWithAI } from "../controllers/github-repo/git-repo-overview.js";
import { getGitRepoPrOrIssues } from "../controllers/git-repo/get-pr-or-issues.js";
import { getGitRepoPrOrIssueDetails } from "../controllers/git-repo/get-pr-or-issue-details.js";
import { getUserGitRepoAccessTokens } from "../controllers/git-repo/access-token-controller.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createGithubRepo)
  .get(checkAuthorization(["all"]), getUserGitRepos);

routes
  .route("/forgejo")
  .post(checkAuthorization(["all"]), createForgejoRepoController);

routes
  .route("/access-tokens")
  .get(checkAuthorization(["all"]), getUserGitRepoAccessTokens);

routes
  .route("/:id/activity")
  .get(checkAuthorization(["all"]), getGitRepoPrOrIssues);

routes
  .route("/:id/activity/:type/:number")
  .get(checkAuthorization(["all"]), getGitRepoPrOrIssueDetails);

routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getGitRepoById)
  .delete(checkAuthorization(["all"]), deleteGithubRepo)
  .post(checkAuthorization(["all"]), updateGithubRepoById);

routes
  .route("/:id/issue/:issueNumber")
  .post(checkAuthorization(["all"]), workOnIssueByIssueId);
routes
  .route("/:id/pull-request/:prNumber")
  .post(checkAuthorization(["all"]), workOnPullRequestByPrNumber);

routes
  .route("/:id/schedule-overview")
  .post(checkAuthorization(["all"]), createGithubRepoOverviewWithAI);
export const gitRepoRoutes = routes;
