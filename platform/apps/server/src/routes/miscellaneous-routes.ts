import { Router } from "express";
import {
  installScript,
  serveServer,
} from "../controllers/miscellaneous-controller.js";

const routes: Router = Router();

routes.route("/install").get(installScript);
routes.route("/install-api").get(serveServer);
routes.route("/vibeongo").get(serveServer);
// routes.route("/install/:id").get();

export const miscellaneousRoutes = routes;
