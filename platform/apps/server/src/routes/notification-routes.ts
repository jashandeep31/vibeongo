import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import { checkRuntimeAuthorization } from "../middlewares/check-runtime-authorization.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notifications/manage-notifications.js";
import {
  deletePushToken,
  unregisterPushToken,
  upsertPushToken,
} from "../controllers/notifications/push-tokens.js";
import { createTestNotification } from "../controllers/notifications/test-notification.js";
import { createRuntimeNotification } from "../controllers/notifications/runtime-notification.js";

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

// no auth: used after a sign out that happened while offline
routes.route("/push-tokens/unregister").post(unregisterPushToken);

// vibeongo server on the instance: notify the instance owner
routes
  .route("/runtime/sessions/:id")
  .post(checkRuntimeAuthorization, createRuntimeNotification);

// TODO: temporary test route, remove before release
routes.route("/test").get(checkAuthorization(["user"]), createTestNotification);

routes
  .route("/:id/read")
  .patch(checkAuthorization(["user"]), markNotificationRead);

export const notificationRoutes = routes;
