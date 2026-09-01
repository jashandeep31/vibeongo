import { apiClient } from "@/lib/api-client";

export const logout = async (): Promise<{ message: string }> => {
  const response = await apiClient.apiClient.get<{ message: string }>(
    "/api/v1/auth/logout",
  );

  return response.data;
};
