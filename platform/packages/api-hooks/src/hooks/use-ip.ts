import { useQuery } from "@tanstack/react-query";

const getCurrentUserIp = async (domain: string): Promise<string> => {
  const response = await fetch(`https://${domain}/proxy/my-ip`);

  if (!response.ok) {
    throw new Error("Failed to fetch current IP");
  }

  const data = (await response.json()) as { ip?: string };
  return data.ip?.trim() ?? "";
};

export const useCurrentUserIp = (domain: string | null | undefined) =>
  useQuery({
    queryKey: ["proxy-current-user-ip", domain],
    queryFn: () => getCurrentUserIp(domain ?? ""),
    enabled: !!domain,
  });
