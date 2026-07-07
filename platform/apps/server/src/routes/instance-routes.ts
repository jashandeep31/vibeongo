import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import { createInstance } from "../controllers/instance/create-instance.js";
import {
  getInstanceById,
  getUserInstances,
  updateInstanceById,
} from "../controllers/instance/get-instances.js";
import { terminateByIdInstance } from "../controllers/instance/terminate-by-id-instance.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createInstance)
  .get(checkAuthorization(["all"]), getUserInstances);
routes
  .route("/:id")
  .get(checkAuthorization(["all"]), getInstanceById)
  .post(checkAuthorization(["all"]), terminateByIdInstance)
  .patch(checkAuthorization(["all"]), updateInstanceById);
export const instanceRoutes = routes;
