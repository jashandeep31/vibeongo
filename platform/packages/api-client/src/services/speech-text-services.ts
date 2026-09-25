import type { AxiosInstance } from "axios";

export const transcribeAudio =
  (apiClient: AxiosInstance) =>
  async (uri: string, signal?: AbortSignal): Promise<string> => {
    const form = new FormData();
    form.append("audio", {
      uri,
      name: "recording.m4a",
      type: "audio/mp4",
    } as unknown as Blob);

    const response = await apiClient.post<{ data: { text: string } }>(
      "/api/v1/speech-text/transcriptions",
      form,
      { timeout: 120_000, ...(signal ? { signal } : {}) },
    );
    return response.data.data.text;
  };
