export const instancesData = [
  {
    name: "t3.micro",
    slug_prefix: "t3-micro",
    description:
      "Burstable general purpose instance for low-traffic apps, dev environments, and small services.",
    cpu: "2 vCPU",
    ram: "1 GiB",
    price_per_hour_dollars: 0.0112,
  },
  {
    name: "m6i.large",
    slug_prefix: "m6i-large",
    description:
      "Balanced Intel general purpose instance for small production services and steady baseline workloads.",
    cpu: "2 vCPU",
    ram: "8 GiB",
    price_per_hour_dollars: 0.101,
  },
  {
    name: "m6i.xlarge",
    slug_prefix: "m6i-xlarge",
    description:
      "Balanced Intel general purpose instance with extra capacity for web apps, APIs, and moderate databases.",
    cpu: "4 vCPU",
    ram: "16 GiB",
    price_per_hour_dollars: 0.202,
  },
  {
    name: "m6i.2xlarge",
    slug_prefix: "m6i-2xlarge",
    description:
      "Mid-sized Intel general purpose instance for larger services, background workers, and multitier workloads.",
    cpu: "8 vCPU",
    ram: "32 GiB",
    price_per_hour_dollars: 0.404,
  },
  {
    name: "m6i.4xlarge",
    slug_prefix: "m6i-4xlarge",
    description:
      "High-capacity Intel general purpose instance for heavy application servers and consolidated workloads.",
    cpu: "16 vCPU",
    ram: "64 GiB",
    price_per_hour_dollars: 0.808,
  },
  {
    name: "m7i.large",
    slug_prefix: "m7i-large",
    description:
      "Latest-generation Intel general purpose instance for small services that need strong per-core performance.",
    cpu: "2 vCPU",
    ram: "8 GiB",
    price_per_hour_dollars: 0.10605,
  },
  {
    name: "m7i.xlarge",
    slug_prefix: "m7i-xlarge",
    description:
      "Latest-generation Intel general purpose instance for production APIs, app servers, and moderate databases.",
    cpu: "4 vCPU",
    ram: "16 GiB",
    price_per_hour_dollars: 0.2121,
  },
  {
    name: "m7i.2xlarge",
    slug_prefix: "m7i-2xlarge",
    description:
      "Latest-generation Intel general purpose instance for demanding services and compute-heavy business workloads.",
    cpu: "8 vCPU",
    ram: "32 GiB",
    price_per_hour_dollars: 0.4242,
  },
] as const;
