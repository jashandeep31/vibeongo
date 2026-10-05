import type { AxiosInstance } from "axios";

export type ProviderCredentialSummary = {
  provider: "codex";
  auth_type: "api_key" | "oauth";
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  updated_at: string;
};

export type GetProviderCredentialsResponse = {
  data: ProviderCredentialSummary[];
};

export const getProviderCredentials =
  (apiClient: AxiosInstance) =>
  async (): Promise<GetProviderCredentialsResponse> => {
    const response = await apiClient.get<GetProviderCredentialsResponse>(
      "/api/v1/users/provider-credentials",
    );
    return response.data;
  };
