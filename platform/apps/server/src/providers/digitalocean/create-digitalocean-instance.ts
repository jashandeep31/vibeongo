import { and, db, eq, instanceRegions } from "@repo/db";
import { createInstanceProps } from "../types.js";
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
}: createInstanceProps): Promise<{
  instanceId: string;
  data: any;
}> => {
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

  const instanceId = crypto.randomUUID();
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
      vpc_uuid: instanceId,
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

  return {
    instanceId,
    data: res.data,
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
