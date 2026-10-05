import { Router } from "express";
import { saveProviderCredentials } from "../controllers/user/provider-credentials-controller.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes.put(
  "/:provider",
  checkAuthorization(["user", "api_key"]),
  saveProviderCredentials,
);

export const providerCredentialsRoutes = routes;
