import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteChat,
  getUserChats,
  renameChat,
} from "../controllers/chats/chats.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["user"]), getUserChats);
routes
  .route("/:id")
  .patch(checkAuthorization(["user"]), renameChat)
  .delete(checkAuthorization(["user"]), deleteChat);

export const chatRoutes = routes;
