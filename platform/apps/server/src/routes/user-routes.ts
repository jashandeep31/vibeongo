import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  createSshKey,
  getSshKeys,
  deleteSshKey,
} from "../controlers/user/ssh-keys-controller.js";

const routes: Router = Router();

routes
  .route("/ssh-key")
  .post(checkAuthorization(["all"]), createSshKey)
  .get(checkAuthorization(["all"]), getSshKeys);

routes.route("/ssh-key/:id").delete(checkAuthorization(["all"]), deleteSshKey);
export const userRoutes = routes;
