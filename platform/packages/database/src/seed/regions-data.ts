export const awsRegionsSeed = [
  {
    provider: "aws",
    name: "US East (N. Virginia)",
    slug: "us-east-1",
    ami: "dummy-ami-us-east-1",
  },
  {
    provider: "aws",
    name: "Asia Pacific (Mumbai)",
    slug: "ap-south-1",
    ami: "dummy-ami-ap-south-1",
  },
] as const;

export const awsInstanceTypesSeed = awsRegionsSeed.map((region) => ({
  provider: "aws" as const,
  region_slug: region.slug,
  name: "m6i.large",
  slug: "m6i.large",
  description: "Balanced Intel general-purpose instance.",
  cpu: 4,
  ram: 8,
  storage: 15,
  price_per_hour_dollars: 0.101,
}));

export const sandboxRegionsSeed = [
  { provider: "e2b", name: "US", slug: "us" },
  { provider: "daytona", name: "US", slug: "us" },
  { provider: "vercel", name: "ap-south-1", slug: "bom1" },
  { provider: "vercel", name: "us-east-1", slug: "iad1" },
  { provider: "boat", name: "Global", slug: "global" },
] as const;

export const sandboxTypesSeed = [
  ...sandboxRegionsSeed
    .filter((region) => region.provider !== "boat")
    .map((region) => ({
      provider: region.provider,
      region_slug: region.slug,
      name: "Custom 4 vCPU / 8 GiB",
      slug: "test",
      description: "Test sandbox with 4 vCPU and 8 GiB RAM.",
      cpu: 4,
      ram: 8,
      storage: 15,
      price_per_second: 123,
    })),
  {
    provider: "boat",
    region_slug: "global",
    name: "Default (4 vCPU / 8 GB)",
    slug: "vibeongo",
    description: "Boat default sandbox from the vibeongo snapshot, with 50 GB disk.",
    cpu: 4,
    ram: 8,
    storage: 15,
    enabled: true,
    price_per_second: 100,
  },
] as const;
