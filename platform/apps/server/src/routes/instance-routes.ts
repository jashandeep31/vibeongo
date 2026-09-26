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
  .post(checkAuthorization(["user", "api_key"]), createInstance)
  .get(checkAuthorization(["user"]), getUserInstances);
routes
  .route("/:id")
  .get(checkAuthorization(["user"]), getInstanceById)
  .post(checkAuthorization(["user"]), terminateByIdInstance)
  .patch(checkAuthorization(["user"]), updateInstanceById);
export const instanceRoutes = routes;
