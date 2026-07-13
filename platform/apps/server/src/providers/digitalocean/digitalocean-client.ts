import { and, db, eq, instanceRegions } from "@repo/db";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
  GetOutboundNetworkUsageProps,
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

  async getOutboundNetworkUsage({
    instanceId,
    startTime,
    endTime,
  }: GetOutboundNetworkUsageProps): Promise<number> {
    const start = Math.floor(startTime.getTime() / 1_000);
    const end = Math.floor(endTime.getTime() / 1_000);
    const res = await this.axiosClient.get(
      "monitoring/metrics/droplet/bandwidth",
      {
        params: {
          host_id: instanceId,
          interface: "public",
          direction: "outbound",
          start,
          end,
        },
      },
    );
    if (res.status !== 200) {
      throw new AppError("Failed to get network usage", 500);
    }

    const results = res.data?.data?.result;
    if (!Array.isArray(results)) return 0;

    const totalBytes = results.reduce((total: number, result: unknown) => {
      if (!result || typeof result !== "object" || !("values" in result)) {
        return total;
      }

      const values = result.values;
      if (!Array.isArray(values)) return total;

      const samples = values
        .map((value: unknown) => {
          if (!Array.isArray(value) || value.length < 2) return null;

          const timestamp = Number(value[0]);
          const megabitsPerSecond = Number(value[1]);
          if (!Number.isFinite(timestamp) || !Number.isFinite(megabitsPerSecond)) {
            return null;
          }

          return { timestamp, megabitsPerSecond };
        })
        .filter(
          (
            sample,
          ): sample is { timestamp: number; megabitsPerSecond: number } =>
            sample !== null,
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      return total + samples.reduce((sampleTotal, sample, index) => {
        const nextTimestamp = samples[index + 1]?.timestamp ?? end;
        const durationInSeconds = Math.max(
          0,
          Math.min(nextTimestamp, end) - Math.max(sample.timestamp, start),
        );
        const bytesPerSecond = (sample.megabitsPerSecond * 1_000_000) / 8;

        return sampleTotal + bytesPerSecond * durationInSeconds;
      }, 0);
    }, 0);

    return Math.round(totalBytes);
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
