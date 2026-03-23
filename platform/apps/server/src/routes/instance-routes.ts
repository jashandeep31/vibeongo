import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import { createInstance } from "../controlers/instance/create-instance.js";

const routes: Router = Router();
routes.route("/").post(checkAuthorization(["all"]), createInstance);

export const instanceRoutes = routes;
