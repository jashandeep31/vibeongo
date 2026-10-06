import { Router } from "express";
import {
  getProviderCredentials,
  saveProviderCredentials,
} from "../controllers/user/provider-credentials-controller.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes.get(
  "/",
  checkAuthorization(["user", "api_key"]),
  getProviderCredentials,
);

routes.put(
  "/:provider",
  checkAuthorization(["user", "api_key"]),
  saveProviderCredentials,
);

export const providerCredentialsRoutes = routes;
