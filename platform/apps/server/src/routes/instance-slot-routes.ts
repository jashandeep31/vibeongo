import { Router } from "express";
import { getInstanceSlotUsage } from "../controllers/instance-slots/get-instance-slot-usage.js";
import { getUserInstanceSlots } from "../controllers/instance-slots/get-instance-slots.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes.route("/usage").get(checkAuthorization(["all"]), getInstanceSlotUsage);
routes.route("/").get(checkAuthorization(["all"]), getUserInstanceSlots);

export const instanceSlotRoutes = routes;
