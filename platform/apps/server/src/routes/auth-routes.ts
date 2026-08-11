import { Router } from "express";
import {
  githubAuthCallbackController,
  githubAuthUrl,
} from "../controllers/auth/github-auth.js";
import { logout } from "../controllers/auth/logout.js";
import { getAuthSession } from "../controllers/auth/session.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();
routes.route("/github").get(githubAuthUrl);
routes.route("/github/callback").get(githubAuthCallbackController);
routes.route("/session").get(checkAuthorization(["all"]), getAuthSession);
routes.route("/logout").get(logout);
export const authRoutes = routes;
