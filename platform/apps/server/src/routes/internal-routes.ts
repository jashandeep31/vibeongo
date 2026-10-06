import { Router } from "express";
import { getTargetHostByDomain } from "../controllers/internal/proxy-controller.js";
import { redeemSshTicket } from "../controllers/project-sessions/ssh-ticket-controller.js";

const routes: Router = Router();

routes.route("/proxy/target-host/resolve").post(getTargetHostByDomain);
routes.route("/ssh-tickets/redeem").post(redeemSshTicket);

export const internalRoutes = routes;
