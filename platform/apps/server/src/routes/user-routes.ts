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
import {
  getUserSettings,
  updateUserSettings,
} from "../controllers/user/settings-controller.js";
import {
  createUserConfig,
  getUserConfig,
  getUserConfigs,
  updateUserConfig,
} from "../controllers/user/config-controller.js";
import { setForgejoPassword } from "../controllers/user/forgejo-controller.js";
import {
  createApiKey,
  getApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../controllers/user/api-keys-controller.js";

const routes: Router = Router();

routes
  .route("/api-keys")
  .post(checkAuthorization(["user"]), createApiKey)
  .get(checkAuthorization(["user"]), getApiKeys);

routes
  .route("/api-keys/:id")
  .delete(checkAuthorization(["user"]), revokeApiKey);

routes
  .route("/api-keys/:id/rotate")
  .post(checkAuthorization(["user"]), rotateApiKey);

routes
  .route("/ssh-keys")
  .post(checkAuthorization(["user"]), createSshKey)
  .get(checkAuthorization(["user"]), getSshKeys);

routes
  .route("/settings")
  .get(checkAuthorization(["user"]), getUserSettings)
  .put(checkAuthorization(["user"]), updateUserSettings);
routes
  .route("/metadata")
  .get(checkAuthorization(["user", "api_key"]), getUserMetadata);

routes
  .route("/forgejo/password")
  .put(checkAuthorization(["user"]), setForgejoPassword);

routes
  .route("/configs")
  .get(checkAuthorization(["user"]), getUserConfigs)
  .post(checkAuthorization(["user"]), createUserConfig);

routes
  .route("/configs/:configType")
  .get(checkAuthorization(["user"]), getUserConfig)
  .put(checkAuthorization(["user"]), updateUserConfig);

routes
  .route("/wallet")
  .get(checkAuthorization(["user", "api_key"]), getUserWallet);
routes
  .route("/credit-grants")
  .get(checkAuthorization(["user"]), getUserCreditGrants);

routes
  .route("/ssh-keys/:id")
  .delete(checkAuthorization(["user"]), deleteSshKey)
  .post(checkAuthorization(["user"]), updateSshKey);

export const userRoutes = routes;
