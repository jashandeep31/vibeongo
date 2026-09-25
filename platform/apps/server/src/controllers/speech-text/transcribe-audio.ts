import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { transcribeSpeech } from "../../ai/speech-text/assemble-ai.js";
import { AppError } from "../../lib/app-error.js";
import { catchAsync } from "../../lib/catch-async.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

export function receiveAudio(req: Request, res: Response, next: NextFunction) {
  upload.single("audio")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(
        new AppError(
          error.code === "LIMIT_FILE_SIZE"
            ? "Audio file is too large"
            : "Invalid audio upload",
          error.code === "LIMIT_FILE_SIZE" ? 413 : 400,
        ),
      );
    }
    if (error) return next(new AppError("Invalid audio upload", 400));
    next();
  });
}

export const transcribeAudio = catchAsync(
  async (req: Request, res: Response) => {
    const audio = req.file;
    if (!audio?.buffer.length)
      throw new AppError("Audio file is required", 400);

    const isMp4 =
      audio.buffer.length >= 12 &&
      audio.buffer.toString("ascii", 4, 8) === "ftyp";
    if (
      !isMp4 ||
      !["audio/mp4", "audio/m4a", "audio/x-m4a"].includes(audio.mimetype)
    ) {
      throw new AppError("Unsupported audio format", 415);
    }

    let text: string;
    try {
      text = await transcribeSpeech(audio.buffer);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "No speech was detected in the recording"
      ) {
        throw new AppError(error.message, 422);
      }
      throw new AppError("Could not transcribe audio. Please try again.", 502);
    }

    res.status(200).json({ data: { text } });
  },
);
