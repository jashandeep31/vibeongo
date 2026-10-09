import {
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from "../controllers/user/email-auth-controller.js";
import {
  githubConnectionStatus,
  startGithubConnection,
  completeMobileGithubConnection,
} from "../controllers/auth/github-connection.js";
import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  mobileSignup,
  mobileSignin,
  signup,
  signin,
  getCurrentUser,
} from "../controllers/user/user-controller.js";
import {
  requireTrustedMobileAuthOrigin,
  requireTrustedAuthOrigin,
  otpSendRateLimit,
  otpVerifyRateLimit,
  passwordResetRateLimit,
  signupRateLimit,
  signinRateLimit,
} from "../middlewares/password-auth-limits.js";
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
  deleteUserConfig,
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

routes.post(
  "/verify-email",
  requireTrustedMobileAuthOrigin,
  otpVerifyRateLimit,
  verifyEmail,
);
routes.post(
  "/resend-verification",
  requireTrustedMobileAuthOrigin,
  otpSendRateLimit,
  resendVerification,
);
routes.post(
  "/forgot-password",
  requireTrustedMobileAuthOrigin,
  otpSendRateLimit,
  forgotPassword,
);
routes.post(
  "/reset-password",
  requireTrustedMobileAuthOrigin,
  passwordResetRateLimit,
  resetPassword,
);
routes.post("/signup", requireTrustedAuthOrigin, signupRateLimit, signup);
routes.post("/signin", requireTrustedAuthOrigin, signinRateLimit, signin);
routes.post(
  "/mobile/signup",
  requireTrustedMobileAuthOrigin,
  signupRateLimit,
  mobileSignup,
);
routes.post(
  "/mobile/signin",
  requireTrustedMobileAuthOrigin,
  signinRateLimit,
  mobileSignin,
);
routes.get(
  "/github-connection",
  checkAuthorization(["user"]),
  githubConnectionStatus,
);
routes.post(
  "/github-connection",
  requireTrustedMobileAuthOrigin,
  signinRateLimit,
  checkAuthorization(["user"]),
  startGithubConnection,
);
routes.post(
  "/github-connection/mobile/complete",
  requireTrustedMobileAuthOrigin,
  signinRateLimit,
  checkAuthorization(["user"]),
  completeMobileGithubConnection,
);
routes.get("/me", checkAuthorization(["user"]), getCurrentUser);

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
  .put(checkAuthorization(["user"]), updateUserConfig)
  .delete(checkAuthorization(["user"]), deleteUserConfig);

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
