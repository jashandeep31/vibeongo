import { db } from "../index.js";
import {
  instanceRegions,
  instanceTypes,
} from "../schemas/instances-metadata.js";

/**
 * Convert dollars → micro dollars
 * example:
 * $5 -> 50000
 */
const micro = (price: number) => Math.round(price * 10000);

/**
 * convert hourly price → per second
 */
const perSec = (hourPrice: number) => Math.round(hourPrice / 3600);

export const regionsSeed: (typeof instanceRegions.$inferInsert)[] = [
  {
    slug: "us-east-1",
    name: "US East (N.Virginia)",
    provider: "aws",
  },
];

const regions = await db.select().from(instanceRegions);
export const instancesSeed: (typeof instanceTypes.$inferInsert)[] = [
  {
    name: "t3.micro",
    slug: "t3-micro-us-east-1",
    region_id: regions.find((region) => (region.slug = "us-east-1"))?.id!,
    provider: "aws",
    price_per_hour: micro(10),
    price_per_sec: perSec(micro(10)),
  },
];

export const createInstances = async () => {
  await db.insert(instanceTypes).values(instancesSeed);
};
