import { Router } from "express";
import {
  googleAuthCallbackController,
  googleAuthUrl,
} from "../controlers/auth/google-auth.js";
import {
  githubAuthCallbackController,
  githubAuthUrl,
} from "../controlers/auth/github-auth.js";

const routes: Router = Router();
routes.route("/google").get(googleAuthUrl);
routes.route("/google/callback").get(googleAuthCallbackController);
routes.route("/github").get(githubAuthUrl);
routes.route("/github/callback").get(githubAuthCallbackController);
// routes.route("/logout").get();
// TODO: make the logout route
export const authRoutes = routes;
