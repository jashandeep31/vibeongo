import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getNotifications,
  markNotificationRead,
} from "../controllers/notifications/manage-notifications.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["user"]), getNotifications);

routes
  .route("/:id/read")
  .patch(checkAuthorization(["user"]), markNotificationRead);

export const notificationRoutes = routes;
