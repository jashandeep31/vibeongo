import { Router } from "express";
import { checkAuthorization } from "../middlewares/check-authorization.js";
import { getUserChats } from "../controllers/chats/chats.js";

const routes: Router = Router();

routes.route("/").get(checkAuthorization(["all"]), getUserChats);

export const chatRoutes = routes;
