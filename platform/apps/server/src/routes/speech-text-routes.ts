import { Router } from "express";
import { issueStreamingToken } from "../controllers/speech-text/create-streaming-token.js";
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

routes.post(
  "/streaming-token",
  checkAuthorization(["user"]),
  issueStreamingToken,
);

export const speechTextRoutes = routes;
