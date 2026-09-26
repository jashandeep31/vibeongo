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
import { getGitRepoPrOrIssues } from "../controllers/git-repo/get-pr-or-issues.js";
import { getGitRepoPrOrIssueDetails } from "../controllers/git-repo/get-pr-or-issue-details.js";
import { AppError } from "../lib/app-error.js";
import {
  getUserGitRepoAccessTokens,
  revokeUserGitRepoAccessToken,
} from "../controllers/git-repo/access-token-controller.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["user"]), createGithubRepo)
  .get(checkAuthorization(["user"]), getUserGitRepos);

routes
  .route("/forgejo")
  .post(checkAuthorization(["user"]), createForgejoRepoController);

routes
  .route("/access-tokens")
  .get(checkAuthorization(["user"]), getUserGitRepoAccessTokens);

routes
  .route("/access-tokens/:id")
  .delete(checkAuthorization(["user"]), revokeUserGitRepoAccessToken);

routes
  .route("/:id/activity")
  .get(checkAuthorization(["user"]), getGitRepoPrOrIssues);

routes
  .route("/:id/activity/:type/:number")
  .get(checkAuthorization(["user"]), getGitRepoPrOrIssueDetails);

routes
  .route("/:id")
  .get(checkAuthorization(["user"]), getGitRepoById)
  .delete(checkAuthorization(["user"]), deleteGithubRepo)
  .post(checkAuthorization(["user"]), updateGithubRepoById);

routes
  .route("/:id/issue/:issueNumber")
  .post(checkAuthorization(["user"]), workOnIssueByIssueId);
routes
  .route("/:id/pull-request/:prNumber")
  .post(checkAuthorization(["user"]), workOnPullRequestByPrNumber);

routes
  .route("/:id/schedule-overview")
  .post(
    checkAuthorization(["user"]),
    (_req, _res, next) =>
      next(
        new AppError("Repository overview feature is currently disabled", 503, {
          reportToSentry: false,
        }),
      ),
  );
export const gitRepoRoutes = routes;
