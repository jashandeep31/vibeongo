import { db } from "../index.js";
import { instances } from "../schemas/instances.js";

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

export const instancesSeed: (typeof instances.$inferInsert)[] = [
  {
    name: "t3.micro",
    slug: "t3-micro-us-east-1",
    region: "us-east-1",
    provider: "aws",
    pricePerHour: micro(10),
    pricePerSec: perSec(micro(10)),
  },
  {
    name: "t3.small",
    slug: "t3-small-us-east-1",
    region: "us-east-1",
    provider: "aws",
    pricePerHour: micro(20),
    pricePerSec: perSec(micro(20)),
  },
  {
    name: "t3.micro",
    slug: "t3-micro-us-east-2",
    region: "us-east-2",
    provider: "aws",
    pricePerHour: micro(11),
    pricePerSec: perSec(micro(11)),
  },
  {
    name: "t3.small",
    slug: "t3-small-us-east-2",
    region: "us-east-2",
    provider: "aws",
    pricePerHour: micro(21),
    pricePerSec: perSec(micro(21)),
  },
];

export const createInstances = async () => {
  await db.insert(instances).values(instancesSeed);
};
