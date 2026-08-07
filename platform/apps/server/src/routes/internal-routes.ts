import { Router } from "express";
import { getTargetHostByDomain } from "../controllers/internal/proxy-controller.js";

const routes: Router = Router();

routes.route("/proxy/target-host/resolve").post(getTargetHostByDomain);

export const internalRoutes = routes;
