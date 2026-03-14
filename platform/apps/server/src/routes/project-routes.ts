import { Router } from "express";
import { createProject } from "../controlers/project/create-project.js";
import { checkAuthorization } from "../lib/check-authorization.js";

const routes: Router = Router();

routes.route("/:id");
routes.route("/").post(checkAuthorization(["all"]), createProject);

export const projectRoutes = routes;
