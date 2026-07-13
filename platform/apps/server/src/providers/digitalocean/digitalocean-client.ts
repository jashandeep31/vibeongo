import { and, db, eq, instanceRegions } from "@repo/db";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
  InstanceIpAddresses,
} from "../types.js";
import { AppError } from "../../lib/app-error.js";
import axios from "axios";
import { env } from "../../lib/env.js";

export class DigitalOceanClient {
  private axiosClient = axios.create({
    baseURL: "https://api.digitalocean.com/v2",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DIGITALOCEAN_API_KEY}`,
    },
  });

  async createInstance({
    region,
    instanceType,
    instanceName,
    userData,
  }: CreateInstanceProps): Promise<CreateInstanceProviderResponse> {
    const [regionRow] = await db
      .select()
      .from(instanceRegions)
      .where(
        and(
          eq(instanceRegions.slug, region),
          eq(instanceRegions.provider, "digitalocean"),
        ),
      );
    if (!regionRow) throw new AppError("Not a valid region ", 404);

    const res = await this.axiosClient.post("/droplets", {
      name: instanceName.split(" ").join("-").toLocaleLowerCase(),
      region: regionRow.slug,
      size: instanceType,
      image: regionRow.ami,
      backups: false,
      ipv6: false,
      monitoring: true,
      user_data: userData,
    });

    if (res.status !== 202) {
      throw new AppError("Failed to create instance", 500);
    }
    const addresses = await this.getIpAddresses(String(res.data.droplet.id));

    return {
      instanceId: String(res.data.droplet.id),
      instanceName,
      ...addresses,
    };
  }

  async terminateInstance({ instanceId }: { instanceId: string }) {
    return await this.axiosClient.delete("/droplets/" + instanceId);
  }

  async getIpAddresses(instanceId: string): Promise<InstanceIpAddresses> {
    const maxAttempts = 12;
    const unavailableAddresses = { publicIPv4: "N/A", pvtIPv4: "N/A" };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await this.axiosClient.get("/droplets/" + instanceId);
        const networks = res.data.droplet?.networks?.v4 ?? [];
        const addresses = {
          publicIPv4:
            networks.find((network: any) => network.type === "public")
              ?.ip_address ?? "N/A",
          pvtIPv4:
            networks.find((network: any) => network.type === "private")
              ?.ip_address ?? "N/A",
        };

        if (addresses.publicIPv4 !== "N/A" || attempt === maxAttempts - 1) {
          return addresses;
        }
      } catch (error) {
        if (!this.isRetryableDigitalOceanError(error)) throw error;
        if (attempt === maxAttempts - 1) {
          return unavailableAddresses;
        }
      }

      await this.waitBeforeRetry(attempt);
    }

    return unavailableAddresses;
  }

  isRetryableDigitalOceanError = (error: unknown) => {
    if (!axios.isAxiosError(error)) return false;

    const status = error.response?.status;
    return status === undefined || status === 429 || status >= 500;
  };

  waitBeforeRetry = async (attempt: number) => {
    const exponentialDelay = Math.min(1_000 * 2 ** attempt, 5_000);
    const jitter = Math.round(exponentialDelay * Math.random() * 0.2);
    await new Promise<void>((resolve) =>
      setTimeout(resolve, exponentialDelay + jitter),
    );
  };
}
