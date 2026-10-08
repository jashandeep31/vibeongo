import type { AxiosInstance } from "axios";

export const transcribeAudio =
  (apiClient: AxiosInstance) =>
  async (audio: string | Blob, signal?: AbortSignal): Promise<string> => {
    const form = new FormData();
    if (typeof audio === "string") {
      const isWav = audio.toLowerCase().endsWith(".wav");
      form.append("audio", {
        uri: audio,
        name: isWav ? "recording.wav" : "recording.m4a",
        type: isWav ? "audio/wav" : "audio/mp4",
      } as unknown as Blob);
    } else {
      form.append(
        "audio",
        audio,
        audio.type === "audio/wav" ? "recording.wav" : "recording.m4a",
      );
    }

    const response = await apiClient.post<{ data: { text: string } }>(
      "/api/v1/speech-text/transcriptions",
      form,
      { timeout: 120_000, ...(signal ? { signal } : {}) },
    );
    return response.data.data.text;
  };

/** Issues a single-use AssemblyAI streaming token for one live session. */
export const createStreamingToken =
  (apiClient: AxiosInstance) =>
  async (signal?: AbortSignal): Promise<string> => {
    const response = await apiClient.post<{ data: { token: string } }>(
      "/api/v1/speech-text/streaming-token",
      undefined,
      { timeout: 15_000, ...(signal ? { signal } : {}) },
    );
    return response.data.data.token;
  };
