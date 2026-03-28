import { Router } from "express";

const routes: Router = Router();

routes.route("/callback");
routes.route("/webhook");

export const githubAppRoutes = routes;
