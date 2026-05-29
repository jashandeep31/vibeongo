import { useQuery } from "@tanstack/react-query";

const USER_IP_URL = "https://proxy.vibeongo.one/proxy/my-ip";

const getCurrentUserIp = async (): Promise<string> => {
  const response = await fetch(USER_IP_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch current IP");
  }

  const data = (await response.json()) as { ip?: string };
  return data.ip?.trim() ?? "";
};

export const useCurrentUserIp = () =>
  useQuery({
    queryKey: ["proxy-current-user-ip"],
    queryFn: getCurrentUserIp,
  });
