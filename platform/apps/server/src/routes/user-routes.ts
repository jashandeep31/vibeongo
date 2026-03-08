import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  createSshKey,
  getSshKeys,
} from "../controlers/user/ssh-keys-controller.js";

const routes: Router = Router();

routes
  .route("/ssh-key")
  .post(checkAuthorization(["all"]), createSshKey)
  .get(checkAuthorization(["all"]), getSshKeys);
export const userRoutes = routes;
