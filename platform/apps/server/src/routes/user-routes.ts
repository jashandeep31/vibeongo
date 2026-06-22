import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  createSshKey,
  getSshKeys,
  deleteSshKey,
  updateSshKey,
} from "../controllers/user/ssh-keys-controller.js";
import { getUserMetadata } from "../controllers/user/metadata.js";
import {
  getUserCreditGrants,
  getUserWallet,
} from "../controllers/user/wallet-controller.js";

const routes: Router = Router();

routes
  .route("/ssh-keys")
  .post(checkAuthorization(["all"]), createSshKey)
  .get(checkAuthorization(["all"]), getSshKeys);

routes.route("/settings").get(checkAuthorization(["all"]));
routes.route("/metadata").get(checkAuthorization(["all"]), getUserMetadata);

routes.route("/wallet").get(checkAuthorization(["all"]), getUserWallet);
routes
  .route("/credit-grants")
  .get(checkAuthorization(["all"]), getUserCreditGrants);

routes
  .route("/ssh-keys/:id")
  .delete(checkAuthorization(["all"]), deleteSshKey)
  .post(checkAuthorization(["all"]), updateSshKey);

export const userRoutes = routes;
