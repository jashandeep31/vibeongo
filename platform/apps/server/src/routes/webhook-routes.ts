import { Router } from "express";
import { projectAutomationWebhook } from "../controllers/project-automations/webhook.js";

const routes: Router = Router();

routes.route("/project-automation/:id").post(projectAutomationWebhook);

export const webhookRoutes = routes;
