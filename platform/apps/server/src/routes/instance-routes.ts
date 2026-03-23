import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import { createInstance } from "../controlers/instance/create-instance.js";
import {
  getInstanceById,
  getUserInstances,
} from "../controlers/instance/get-instances.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createInstance)
  .get(checkAuthorization(["all"]), getUserInstances);

routes.route("/:id").get(checkAuthorization(["all"]), getInstanceById);
export const instanceRoutes = routes;
