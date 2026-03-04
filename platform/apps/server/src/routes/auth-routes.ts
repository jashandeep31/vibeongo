import { Router } from "express";
import {
  googleAuthCallbackController,
  googleAuthUrl,
} from "../controlers/auth/google-auth.js";

const routes: Router = Router();
routes.route("/auth/google").get(googleAuthUrl);
routes.route("/auth/google/callback").get(googleAuthCallbackController);
// routes.route("/logout").get();
// TODO: make the logout route
export const authRoutes = routes;
