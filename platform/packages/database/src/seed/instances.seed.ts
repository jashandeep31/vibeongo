import { db } from "../index.js";
import { instanceTypes } from "../schemas/instances-metadata.js";

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

export const instancesSeed: (typeof instanceTypes.$inferInsert)[] = [
  {
    name: "t3.micro",
    slug: "t3-micro-us-east-1",
    region: "us-east-1",
    provider: "aws",
    price_per_hour: micro(10),
    price_per_sec: perSec(micro(10)),
  },
];

export const createInstances = async () => {
  await db.insert(instanceTypes).values(instancesSeed);
};
