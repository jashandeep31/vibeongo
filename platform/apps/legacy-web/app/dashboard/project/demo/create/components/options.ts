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
  cpu: number;
  ram: number;
  storage: number;
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
    cpu: 2,
    ram: 1,
    storage: 15,
    price: "$5/mo",
    icon: Server,
  },
  {
    id: "t3.small",
    name: "Standard",
    description: "Good for small production workloads",
    cpu: 2,
    ram: 2,
    storage: 15,
    price: "$10/mo",
    icon: Cpu,
  },
  {
    id: "t3.medium",
    name: "Pro",
    description: "For more demanding applications",
    cpu: 2,
    ram: 4,
    storage: 15,
    price: "$20/mo",
    icon: Server,
  },
];
