import { Router } from "express";

const routes: Router = Router();

routes.route("/:id/config");
export const projectSessionRoutes = routes;
