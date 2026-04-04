import { Router } from "express";
import { checkAuthorization } from "../lib/check-authorization.js";
import {
  createSshKey,
  getSshKeys,
  deleteSshKey,
} from "../controllers/user/ssh-keys-controller.js";
import { getUserMetadata } from "../controllers/user/metadata.js";
import {
  createAuthToken,
  deleteAuthToken,
  getAuthTokens,
} from "../controllers/user/auth-tokens-controller.js";

const routes: Router = Router();

routes
  .route("/ssh-keys")
  .post(checkAuthorization(["all"]), createSshKey)
  .get(checkAuthorization(["all"]), getSshKeys);

routes
  .route("/ssh-key")
  .post(checkAuthorization(["all"]), createSshKey)
  .get(checkAuthorization(["all"]), getSshKeys);

routes.route("/metadata").get(checkAuthorization(["all"]), getUserMetadata);

routes.route("/ssh-keys/:id").delete(checkAuthorization(["all"]), deleteSshKey);
routes.route("/ssh-key/:id").delete(checkAuthorization(["all"]), deleteSshKey);

routes
  .route("/auth-tokens")
  .get(checkAuthorization(["all"]), getAuthTokens)
  .post(checkAuthorization(["all"]), createAuthToken);

routes
  .route("/auth-tokens/:id")
  .delete(checkAuthorization(["all"]), deleteAuthToken);
export const userRoutes = routes;
