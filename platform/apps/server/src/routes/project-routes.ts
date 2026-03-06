import { Router } from "express";
import { createProject } from "../controlers/project/create-project.js";

const routes: Router = Router();

routes.route("/:id");
routes.route("/").post(createProject);

export const projectRoutes = routes;
