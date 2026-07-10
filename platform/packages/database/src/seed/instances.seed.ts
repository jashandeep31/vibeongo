import { db } from "../index.js";
import {
  instanceRegions,
  instanceTypes,
} from "../schemas/instances-metadata.js";
import { instancesData } from "./instances-data.js";

/**
 * Convert dollars → micro dollars
 * example:
 * $5 -> 50000
 */
const getRoundedPrice = (price: number): number => {
  return Math.ceil(price * 10000);
};

const digitalOceanRegions = [{ slug: "BLR1", name: "Bangalore" }] as const;

const awsRegions = [
  // { slug: "af-south-1", name: "Africa (Cape Town)" },
  // { slug: "ap-east-1", name: "Asia Pacific (Hong Kong)" },
  // { slug: "ap-east-2", name: "Asia Pacific (Taipei)" },
  // { slug: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
  // { slug: "ap-northeast-2", name: "Asia Pacific (Seoul)" },
  // { slug: "ap-northeast-3", name: "Asia Pacific (Osaka)" },
  { slug: "ap-south-1", name: "Asia Pacific (Mumbai)" },
  // { slug: "ap-south-2", name: "Asia Pacific (Hyderabad)" },
  // { slug: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
  // { slug: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
  // { slug: "ap-southeast-3", name: "Asia Pacific (Jakarta)" },
  // { slug: "ap-southeast-4", name: "Asia Pacific (Melbourne)" },
  // { slug: "ap-southeast-5", name: "Asia Pacific (Malaysia)" },
  // { slug: "ap-southeast-6", name: "Asia Pacific (New Zealand)" },
  // { slug: "ap-southeast-7", name: "Asia Pacific (Thailand)" },
  // { slug: "ca-central-1", name: "Canada (Central)" },
  // { slug: "ca-west-1", name: "Canada West (Calgary)" },
  // { slug: "cn-north-1", name: "China (Beijing)" },
  // { slug: "cn-northwest-1", name: "China (Ningxia)" },
  // { slug: "eu-central-1", name: "Europe (Frankfurt)" },
  // { slug: "eu-central-2", name: "Europe (Zurich)" },
  // { slug: "eu-north-1", name: "Europe (Stockholm)" },
  // { slug: "eu-south-1", name: "Europe (Milan)" },
  // { slug: "eu-south-2", name: "Europe (Spain)" },
  // { slug: "eu-west-1", name: "Europe (Ireland)" },
  // { slug: "eu-west-2", name: "Europe (London)" },
  // { slug: "eu-west-3", name: "Europe (Paris)" },
  // { slug: "il-central-1", name: "Israel (Tel Aviv)" },
  // { slug: "me-central-1", name: "Middle East (UAE)" },
  // { slug: "me-south-1", name: "Middle East (Bahrain)" },
  // { slug: "mx-central-1", name: "Mexico (Central)" },
  // { slug: "sa-east-1", name: "South America (Sao Paulo)" },
  { slug: "us-east-1", name: "US East (N. Virginia)" },
  // { slug: "us-east-2", name: "US East (Ohio)" },
  // { slug: "us-gov-east-1", name: "AWS GovCloud (US-East)" },
  // { slug: "us-gov-west-1", name: "AWS GovCloud (US-West)" },
  // { slug: "us-west-1", name: "US West (N. California)" },
  // { slug: "us-west-2", name: "US West (Oregon)" },
] as const;

export const regionsSeed: (typeof instanceRegions.$inferInsert)[] = [
  ...awsRegions.map((region: any) => ({
    ...region,
    ami: "Please change this ",
    provider: "aws",
  })),
  ...digitalOceanRegions.map((region: any) => ({
    ...region,
    ami: "ubuntu-24-04-x64",
    provider: "digitalocean",
  })),
];

type RegionRecord = Pick<
  typeof instanceRegions.$inferSelect,
  "id" | "slug" | "provider"
>;

const buildInstancesSeed = (
  regions: RegionRecord[],
): (typeof instanceTypes.$inferInsert)[] =>
  regions.flatMap((region) =>
    instancesData
      .filter((template) => template.provider === region.provider)
      .map((template) => {
        const pricePerHour = getRoundedPrice(template.price_per_hour_dollars);
        return {
          name: template.name,
          slug: `${template.slug_prefix}-${region.slug}`,
          description: template.description,
          cpu: template.cpu,
          ram: template.ram,
          provider: template.provider,
          region_id: region.id,
          price_per_hour: pricePerHour,
        };
      }),
  );

export const createInstances = async () => {
  const existingRegions = await db
    .select({
      id: instanceRegions.id,
      slug: instanceRegions.slug,
      provider: instanceRegions.provider,
    })
    .from(instanceRegions);

  const existingRegionSlugs = new Set(
    existingRegions.map((region) => `${region.provider}:${region.slug}`),
  );
  const missingRegions = regionsSeed.filter(
    (region) => !existingRegionSlugs.has(`${region.provider}:${region.slug}`),
  );

  if (missingRegions.length > 0) {
    await db.insert(instanceRegions).values(missingRegions);
  }

  const allRegions = await db
    .select({
      id: instanceRegions.id,
      slug: instanceRegions.slug,
      provider: instanceRegions.provider,
    })
    .from(instanceRegions);

  const expectedInstances = buildInstancesSeed(allRegions);
  const existingInstanceSlugs = new Set(
    (await db.select({ slug: instanceTypes.slug }).from(instanceTypes)).map(
      (instance) => instance.slug,
    ),
  );

  const missingInstances = expectedInstances.filter(
    (instance) => !existingInstanceSlugs.has(instance.slug),
  );

  if (missingInstances.length > 0) {
    await db.insert(instanceTypes).values(missingInstances);
  }
};
