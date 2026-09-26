import type { AxiosInstance } from "axios";

export type ApiKey = {
  id: string;
  name: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
};

export type CreateApiKeyInput = {
  name: string;
};

export type CreateApiKeyResponse = {
  data: {
    id: string;
    name: string;
    key: string;
    expires_at: string;
  };
};

export type RotateApiKeyResponse = CreateApiKeyResponse;

export type GetApiKeysParams = {
  page?: number;
  limit?: number;
};

export type GetApiKeysResponse = {
  data: ApiKey[];
  page: number;
  hasNext: boolean;
};

export const createApiKey =
  (apiClient: AxiosInstance) =>
  async (input: CreateApiKeyInput): Promise<CreateApiKeyResponse> => {
    const response = await apiClient.post("/api/v1/users/api-keys", input);
    return response.data;
  };

export const getApiKeys =
  (apiClient: AxiosInstance) =>
  async (params: GetApiKeysParams = {}): Promise<GetApiKeysResponse> => {
    const response = await apiClient.get("/api/v1/users/api-keys", { params });
    return response.data;
  };

export const deleteApiKey =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/users/api-keys/${id}`);
    return response.data;
  };

export const rotateApiKey =
  (apiClient: AxiosInstance) =>
  async (id: string): Promise<RotateApiKeyResponse> => {
    const response = await apiClient.post(
      `/api/v1/users/api-keys/${id}/rotate`,
    );
    return response.data;
  };
