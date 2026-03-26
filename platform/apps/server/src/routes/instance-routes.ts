import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import { createInstance } from "../controlers/instance/create-instance.js";
import {
  getInstanceById,
  getInstancesByProjectId,
  getUserInstances,
} from "../controlers/instance/get-instances.js";
import { terminateByIdInstance } from "../controlers/instance/terminate-by-id-instance.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createInstance)
  .get(checkAuthorization(["all"]), getUserInstances);
routes
  .route("/project/:projectId")
  .get(checkAuthorization(["all"]), getInstancesByProjectId);
routes.route("/:id").get(checkAuthorization(["all"]), getInstanceById);
routes.route("/:id").post(checkAuthorization(["all"]), terminateByIdInstance);
export const instanceRoutes = routes;
