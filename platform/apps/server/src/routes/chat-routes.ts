import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import {
  deleteChat,
  getUserChats,
  renameChat,
} from "../controllers/chats/chats.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserChats);
routes
  .route("/:id")
  .patch(checkAuthorization(["all"]), renameChat)
  .delete(checkAuthorization(["all"]), deleteChat);

export const chatRoutes = routes;
