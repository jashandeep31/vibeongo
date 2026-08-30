import { Router } from "express";
import { getUserInstanceSlots } from "../controllers/instance-slots/get-instance-slots.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserInstanceSlots);

export const instanceSlotRoutes = routes;
