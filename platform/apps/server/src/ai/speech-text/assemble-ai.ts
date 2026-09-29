import { AssemblyAI } from "assemblyai";
import { env } from "../../lib/env.js";

const client = new AssemblyAI({ apiKey: env.ASSEMBLYAI_API_KEY });

export const transcribeSpeech = async (audio: Buffer): Promise<string> => {
  const transcript = await client.transcripts.transcribe(
    {
      audio,
      speech_models: ["universal-3-5-pro", "universal-2"],
    },
    { pollingTimeout: 90_000 },
  );

  if (transcript.status === "error") {
    throw new Error("Audio transcription failed");
  }

  const text = transcript.text?.trim();
  if (!text) {
    throw new Error("No speech was detected in the recording");
  }

  return text;
};

// AssemblyAI streaming tokens are single-use: each one opens exactly one
export const createStreamingToken = async (): Promise<string> => {
  return client.streaming.createTemporaryToken({
    expires_in_seconds: 60,
    max_session_duration_seconds: 180,
  });
};
