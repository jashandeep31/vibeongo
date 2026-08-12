import { Router } from "express";
import {
  githubAuthCallbackController,
  githubAuthUrl,
} from "../controllers/auth/github-auth.js";
import { logout } from "../controllers/auth/logout.js";
import { expressErrorHandler } from "@sentry/node";

const routes: Router = Router();
routes.route("/github").get(githubAuthUrl);
routes.route("/github/callback").get(githubAuthCallbackController);
routes.route("/mobile/exchange").post(expressErrorHandler);
routes.route("/logout").get(logout);
export const authRoutes = routes;
