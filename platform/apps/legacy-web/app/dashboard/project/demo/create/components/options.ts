import { Cpu, Globe, Server, type LucideIcon } from "lucide-react";

export type RegionOption = {
  id: string;
  name: string;
  icon: LucideIcon;
};

export type InstanceOption = {
  id: string;
  name: string;
  description: string;
  cpu: string;
  ram: string;
  price: string;
  icon: LucideIcon;
};

export const REGIONS: RegionOption[] = [
  {
    id: "us-east-1",
    name: "US East (N. Virginia)",
    icon: Globe,
  },
  {
    id: "us-east-2",
    name: "US East (Ohio)",
    icon: Globe,
  },
];

export const INSTANCES: InstanceOption[] = [
  {
    id: "t3.micro",
    name: "Starter",
    description: "Best for hobby projects and testing",
    cpu: "2 vCPU",
    ram: "1 GB RAM",
    price: "$5/mo",
    icon: Server,
  },
  {
    id: "t3.small",
    name: "Standard",
    description: "Good for small production workloads",
    cpu: "2 vCPU",
    ram: "2 GB RAM",
    price: "$10/mo",
    icon: Cpu,
  },
  {
    id: "t3.medium",
    name: "Pro",
    description: "For more demanding applications",
    cpu: "2 vCPU",
    ram: "4 GB RAM",
    price: "$20/mo",
    icon: Server,
  },
];
