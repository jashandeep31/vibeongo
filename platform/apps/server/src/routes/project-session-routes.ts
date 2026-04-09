import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getUserProjectSesssion,
  resumeProjectSession,
} from "../controllers/project-sessions/project-sessions.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserProjectSesssion);
routes.route("/:id").post(checkAuthorization(["all"]), resumeProjectSession);

export const projectSessionRoutes = routes;
