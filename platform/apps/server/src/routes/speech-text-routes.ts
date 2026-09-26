import { Router } from "express";
import {
  receiveAudio,
  transcribeAudio,
} from "../controllers/speech-text/transcribe-audio.js";
import { checkAuthorization } from "../middlewares/check-authorization.js";

const routes: Router = Router();

routes.post(
  "/transcriptions",
  checkAuthorization(["user"]),
  receiveAudio,
  transcribeAudio,
);

export const speechTextRoutes = routes;
