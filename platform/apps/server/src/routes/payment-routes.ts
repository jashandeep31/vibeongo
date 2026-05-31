import { Router } from "express";
import { getDodoPaymentCheckoutUrl } from "../controllers/payments/dodo-payments.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes
  .route("/add-credits")
  .post(checkAuthorization(["all"]), getDodoPaymentCheckoutUrl);
routes.route("/").get(checkAuthorization(["all"]));

export const paymentRoutes = routes;
