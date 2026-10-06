import type { AxiosInstance } from "axios";

export type CreateSshTicketResponse = {
  ticket: string;
  expiresAt: string;
  username: string;
  host: string;
  port: number;
};

export const createSshTicket =
  (apiClient: AxiosInstance) =>
  async (projectSessionId: string): Promise<CreateSshTicketResponse> => {
    const response = await apiClient.post<CreateSshTicketResponse>(
      `/api/v1/project-sessions/${encodeURIComponent(projectSessionId)}/ssh-ticket`,
      undefined,
      { withCredentials: true },
    );
    return response.data;
  };
