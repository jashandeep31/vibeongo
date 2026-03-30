import { Router } from "express";
import {
  githubAuthCallbackController,
  githubAuthUrl,
} from "../controlers/auth/github-auth.js";

const routes: Router = Router();
routes.route("/github").get(githubAuthUrl);
routes.route("/github/callback").get(githubAuthCallbackController);
// routes.route("/logout").get();
// TODO: make the logout route
export const authRoutes = routes;
