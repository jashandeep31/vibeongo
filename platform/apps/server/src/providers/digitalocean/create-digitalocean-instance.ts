import { and, db, eq, instanceRegions } from "@repo/db";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
} from "../types.js";
import { AppError } from "../../lib/app-error.js";
import axios from "axios";
import { env } from "../../lib/env.js";

const API_ENDPOINT = "https://api.digitalocean.com";

export const createDigitalOceanInstance = async ({
  provider,
  region,
  instanceType,
  instanceName,
  userData,
}: CreateInstanceProps): Promise<CreateInstanceProviderResponse> => {
  const [regionRow] = await db
    .select()
    .from(instanceRegions)
    .where(
      and(
        eq(instanceRegions.slug, region),
        eq(instanceRegions.provider, provider),
      ),
    );
  if (!regionRow) throw new AppError("Not a valid region ", 404);

  const res = await axios.post(
    API_ENDPOINT,
    {
      name: instanceName,
      region: regionRow.slug,
      size: instanceType,
      image: regionRow.ami,
      backups: false,
      ipv6: false,
      monitoring: true,
      user_data: userData,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env["DIGITALOCEAN_TOKEN"],
      },
    },
  );
  if (res.status !== 202) {
    throw new AppError("Failed to create instance", 500);
  }
  let publicIPv4 = "";
  let pvtIPv4 = "";
  for (const { type, ip_address } of res.data.droplet.networks.v4) {
    if (type === "public") {
      publicIPv4 = ip_address;
    } else if (type === "private") {
      pvtIPv4 = ip_address;
    }
  }

  return {
    instanceId: res.data.droplet.id,
    instanceName,
    publicIPv4,
    pvtIPv4,
  };
};

export const deleteDigitalOceanInsatnce = async ({
  instanceId,
}: {
  instanceId: string;
}) => {
  const res = await axios.delete(API_ENDPOINT + `/v2/droplets/${instanceId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer" + env.DIGITALOCEAN_API_KEY,
    },
  });
  return res;
};
