import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import { createInstance } from "../controlers/instance/create-instance.js";
import { getUserIntances } from "../controlers/instance/get-instances.js";

const routes: Router = Router();
routes
  .route("/")
  .post(checkAuthorization(["all"]), createInstance)
  .get(checkAuthorization(["all"]), getUserIntances);

export const instanceRoutes = routes;
