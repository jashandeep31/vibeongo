import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications/manage-notifications.js";
import {
  deletePushToken,
  upsertPushToken,
} from "../controllers/notifications/push-tokens.js";
import { createTestNotification } from "../controllers/notifications/test-notification.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["user"]), getNotifications);

routes
  .route("/unread-count")
  .get(checkAuthorization(["user"]), getUnreadNotificationCount);

routes
  .route("/read-all")
  .patch(checkAuthorization(["user"]), markAllNotificationsRead);

routes
  .route("/push-tokens")
  .put(checkAuthorization(["user"]), upsertPushToken)
  .delete(checkAuthorization(["user"]), deletePushToken);

// TODO: temporary test route, remove before release
routes.route("/test").get(checkAuthorization(["user"]), createTestNotification);

routes
  .route("/:id/read")
  .patch(checkAuthorization(["user"]), markNotificationRead);

export const notificationRoutes = routes;
