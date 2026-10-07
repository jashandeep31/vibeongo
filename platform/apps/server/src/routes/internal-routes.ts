import { Router } from "express";
import { getTargetHostByDomain } from "../controllers/internal/proxy-controller.js";
import { authorizeSshAccess } from "../controllers/project-sessions/ssh-access-controller.js";

const routes: Router = Router();

routes.route("/proxy/target-host/resolve").post(getTargetHostByDomain);
routes.route("/ssh-access/authorize").post(authorizeSshAccess);

export const internalRoutes = routes;
