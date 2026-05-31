import { Router } from "express";
import { getDodoPaymentCheckoutUrl } from "../controllers/payments/dodo-payments.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes
  .route("/wallet-recharge")
  .post(checkAuthorization(["all"]), getDodoPaymentCheckoutUrl);

export const paymentRoutes = routes;
