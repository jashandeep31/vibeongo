import {
  and,
  db,
  eq,
  instanceRegions,
  instanceTypes,
  sandboxRegions,
  sandboxTypes,
} from "../index.js";
import {
  awsInstanceTypesSeed,
  awsRegionsSeed,
  sandboxRegionsSeed,
  sandboxTypesSeed,
} from "./regions-data.js";

const PRICE_PRECISION = 10_000_000;

const ensureAwsRegion = async (
  region: (typeof awsRegionsSeed)[number],
) => {
  const [existing] = await db
    .select({ id: instanceRegions.id })
    .from(instanceRegions)
    .where(
      and(
        eq(instanceRegions.provider, region.provider),
        eq(instanceRegions.slug, region.slug),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(instanceRegions)
    .values(region)
    .returning({ id: instanceRegions.id });

  if (!created) throw new Error(`Failed to create AWS region ${region.slug}`);
  return created;
};

const ensureSandboxRegion = async (
  region: (typeof sandboxRegionsSeed)[number],
) => {
  const [existing] = await db
    .select({ id: sandboxRegions.id })
    .from(sandboxRegions)
    .where(
      and(
        eq(sandboxRegions.provider, region.provider),
        eq(sandboxRegions.slug, region.slug),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(sandboxRegions)
    .values(region)
    .returning({ id: sandboxRegions.id });

  if (!created) {
    throw new Error(
      `Failed to create ${region.provider} sandbox region ${region.slug}`,
    );
  }
  return created;
};

const main = async () => {
  const awsRegionIds = new Map<string, string>();
  for (const region of awsRegionsSeed) {
    const savedRegion = await ensureAwsRegion(region);
    awsRegionIds.set(region.slug, savedRegion.id);
  }

  for (const instanceType of awsInstanceTypesSeed) {
    const regionId = awsRegionIds.get(instanceType.region_slug);
    if (!regionId) {
      throw new Error(`AWS region ${instanceType.region_slug} was not found`);
    }

    const [existing] = await db
      .select({ id: instanceTypes.id })
      .from(instanceTypes)
      .where(
        and(
          eq(instanceTypes.provider, instanceType.provider),
          eq(instanceTypes.region_id, regionId),
          eq(instanceTypes.slug, instanceType.slug),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(instanceTypes).values({
        ...instanceType,
        region_id: regionId,
        price_per_hour: Math.round(
          instanceType.price_per_hour_dollars * PRICE_PRECISION,
        ),
      });
    }
  }

  const sandboxRegionIds = new Map<string, string>();
  for (const region of sandboxRegionsSeed) {
    const savedRegion = await ensureSandboxRegion(region);
    sandboxRegionIds.set(`${region.provider}:${region.slug}`, savedRegion.id);
  }

  for (const sandboxType of sandboxTypesSeed) {
    const regionId = sandboxRegionIds.get(
      `${sandboxType.provider}:${sandboxType.region_slug}`,
    );
    if (!regionId) {
      throw new Error(
        `Sandbox region ${sandboxType.provider}:${sandboxType.region_slug} was not found`,
      );
    }

    const [existing] = await db
      .select({ id: sandboxTypes.id })
      .from(sandboxTypes)
      .where(
        and(
          eq(sandboxTypes.provider, sandboxType.provider),
          eq(sandboxTypes.sandbox_region, regionId),
          eq(sandboxTypes.slug, sandboxType.slug),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(sandboxTypes).values({
        ...sandboxType,
        sandbox_region: regionId,
      });
    }
  }

  console.log("Instance and sandbox metadata seeded.");
};

void main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
