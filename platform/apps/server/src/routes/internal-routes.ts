import { Router } from "express";
import { getTargetHostByDomain as resolveTargetHostByDomain } from "../controllers/internal/proxy-controller.js";

const routes: Router = Router();

routes.route("/proxy/target-host/resolve").post(resolveTargetHostByDomain);

export const internalRoutes = routes;
