import { and, db, eq, instanceRegions } from "@repo/db";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
} from "../types.js";
import { AppError } from "../../lib/app-error.js";
import axios from "axios";
import { env } from "../../lib/env.js";
import { getDigitalOceanInstanceIpAddresses } from "./get-digitalocean-instance-ip-addresses.js";

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
    API_ENDPOINT + "/v2/droplets",
    {
      name: instanceName.split(" ").join("-").toLocaleLowerCase(),
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
        Authorization: "Bearer " + env.DIGITALOCEAN_API_KEY,
      },
    },
  );
  console.log(res.data);
  if (res.status !== 202) {
    throw new AppError("Failed to create instance", 500);
  }
  const addresses = await getDigitalOceanInstanceIpAddresses({
    instanceId: String(res.data.droplet.id),
  });

  return {
    instanceId: String(res.data.droplet.id),
    instanceName,
    ...addresses,
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
