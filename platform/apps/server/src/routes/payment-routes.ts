import { Router } from "express";
import { getDodoPaymentCheckoutUrl } from "../controllers/payments/dodo-payments.js";

const routes: Router = Router();

routes.route("/").get(getDodoPaymentCheckoutUrl);

export const paymentRoutes = routes;
