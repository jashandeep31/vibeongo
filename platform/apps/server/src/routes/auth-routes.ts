import { Router } from "express";
import {
  githubAuthCallbackController,
  githubAuthUrl,
} from "../controllers/auth/github-auth.js";
import { exchangeMobileToken } from "../controllers/auth/exchange-token.js";
import { logout } from "../controllers/auth/logout.js";

const routes: Router = Router();
routes.route("/github").get(githubAuthUrl);
routes.route("/github/callback").get(githubAuthCallbackController);
routes.route("/mobile/exchange").post(exchangeMobileToken);
routes.route("/logout").get(logout);
export const authRoutes = routes;
