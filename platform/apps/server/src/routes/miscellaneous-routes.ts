import { Router } from "express";
import { serveBootstrapServer } from "../controlers/miscellaneous-controller.js";

const routes: Router = Router();

routes.route("/install").get(serveBootstrapServer);
// routes.route("/install/:id").get();

export const miscellaneousRoutes = routes;
