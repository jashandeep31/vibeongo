import { Router } from "express";
import {
  serveBootstrapServer,
  serveServer,
} from "../controlers/miscellaneous-controller.js";

const routes: Router = Router();

routes.route("/install").get(serveBootstrapServer);
routes.route("/install-api").get(serveServer);
// routes.route("/install/:id").get();

export const miscellaneousRoutes = routes;
