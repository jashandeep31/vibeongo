import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import { getUserProjectSesssion } from "../controllers/project-sessions/get-user-sessions.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserProjectSesssion);

export const projectSessionRoutes = routes;
