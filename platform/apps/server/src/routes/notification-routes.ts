import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getNotifications,
  markNotificationRead,
} from "../controllers/notifications/manage-notifications.js";
import {
  deletePushToken,
  upsertPushToken,
} from "../controllers/notifications/push-tokens.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["user"]), getNotifications);

routes
  .route("/push-tokens")
  .put(checkAuthorization(["user"]), upsertPushToken)
  .delete(checkAuthorization(["user"]), deletePushToken);

routes
  .route("/:id/read")
  .patch(checkAuthorization(["user"]), markNotificationRead);

export const notificationRoutes = routes;
