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
  // Seed only one AWS EC2 type and one E2B type, with their required regions.
  const awsRegion = awsRegionsSeed[0];
  const awsType = awsInstanceTypesSeed.find(
    (type) => type.region_slug === awsRegion.slug,
  );
  const e2bRegion = sandboxRegionsSeed.find(
    (region) => region.provider === "e2b",
  );
  const e2bType = sandboxTypesSeed.find(
    (type) => type.provider === "e2b" && type.region_slug === e2bRegion?.slug,
  );

  if (!awsType || !e2bRegion || !e2bType) {
    throw new Error("The AWS EC2 and E2B seed entries are required");
  }

  const awsRegionIds = new Map<string, string>();
  // for (const region of awsRegionsSeed) {
  for (const region of [awsRegion]) {
    const savedRegion = await ensureAwsRegion(region);
    awsRegionIds.set(region.slug, savedRegion.id);
  }

  // for (const instanceType of awsInstanceTypesSeed) {
  for (const instanceType of [awsType]) {
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
  // for (const region of sandboxRegionsSeed) {
  for (const region of [e2bRegion]) {
    const savedRegion = await ensureSandboxRegion(region);
    sandboxRegionIds.set(`${region.provider}:${region.slug}`, savedRegion.id);
  }

  // for (const sandboxType of sandboxTypesSeed) {
  for (const sandboxType of [e2bType]) {
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

  console.log("One AWS EC2 type and one E2B type seeded with their regions.");
};

void main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
