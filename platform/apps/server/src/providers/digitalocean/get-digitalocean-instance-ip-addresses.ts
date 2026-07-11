import axios from "axios";
import { env } from "../../lib/env.js";
import type { InstanceIpAddresses } from "../types.js";

const API_ENDPOINT = "https://api.digitalocean.com";
const MAX_INSTANCE_IP_LOOKUP_ATTEMPTS = 12;
const UNAVAILABLE_IP_ADDRESSES: InstanceIpAddresses = {
  publicIPv4: "N/A",
  pvtIPv4: "N/A",
};

interface DigitalOceanNetwork {
  type: "private" | "public";
  ip_address?: string;
}

interface DigitalOceanDropletResponse {
  droplet?: {
    networks?: {
      v4?: DigitalOceanNetwork[];
    };
  };
}

export const getDigitalOceanInstanceIpAddresses = async ({
  instanceId,
}: {
  instanceId: string;
}): Promise<InstanceIpAddresses> => {
  for (let attempt = 0; attempt < MAX_INSTANCE_IP_LOOKUP_ATTEMPTS; attempt++) {
    try {
      const res = await axios.get<DigitalOceanDropletResponse>(
        `${API_ENDPOINT}/v2/droplets/${instanceId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.DIGITALOCEAN_API_KEY}`,
          },
        },
      );
      const networks = res.data.droplet?.networks?.v4 ?? [];

      const addresses = {
        publicIPv4:
          networks.find((network) => network.type === "public")?.ip_address ??
          "N/A",
        pvtIPv4:
          networks.find((network) => network.type === "private")?.ip_address ??
          "N/A",
      };

      if (
        addresses.publicIPv4 !== "N/A" ||
        attempt === MAX_INSTANCE_IP_LOOKUP_ATTEMPTS - 1
      ) {
        return addresses;
      }
    } catch (error) {
      if (!isRetryableDigitalOceanError(error)) throw error;
      if (attempt === MAX_INSTANCE_IP_LOOKUP_ATTEMPTS - 1) {
        return UNAVAILABLE_IP_ADDRESSES;
      }
    }

    await waitBeforeRetry(attempt);
  }

  return UNAVAILABLE_IP_ADDRESSES;
};

const isRetryableDigitalOceanError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

const waitBeforeRetry = async (attempt: number) => {
  const exponentialDelay = Math.min(1_000 * 2 ** attempt, 5_000);
  const jitter = Math.round(exponentialDelay * Math.random() * 0.2);
  await new Promise<void>((resolve) =>
    setTimeout(resolve, exponentialDelay + jitter),
  );
};
