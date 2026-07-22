import { instanceProvidersEnum, instanceRuntimeKind } from "@repo/db";
import { awsSupportedRegions } from "./aws/configs/aws-supported-regions-configs.js";

export type InstanceProvider =
  (typeof instanceProvidersEnum.enumValues)[number];
export type InstanceRuntime =
  (typeof instanceRuntimeKind.enumValues)[number];
export type AwsSupportedRegion = (typeof awsSupportedRegions)[number];

export interface CreateProviderInstanceProps {
  provider: InstanceProvider;
  region: string;
  instanceType: string;
  userData: string;
  runtime: InstanceRuntime;
}

export interface CreateInstanceProps extends Omit<
  CreateProviderInstanceProps,
  "provider" | "runtime"
> {
  instanceName: string;
}

export interface CreateInstanceProviderResponse {
  instanceId: string;
  instanceName: string;
  publicIPv4: string;
  pvtIPv4: string;
}

export interface InstanceIpAddresses {
  publicIPv4: string;
  pvtIPv4: string;
}

export interface TerminateProviderInstanceProps {
  provider: InstanceProvider;
  region: string;
  instanceId: string;
  runtime: InstanceRuntime;
}

export interface TerminateProviderInstanceResponse {
  terminated: boolean;
}

export interface GetOutboundNetworkUsageProps {
  region: string;
  instanceId: string;
  startTime: Date;
  endTime: Date;
}

export interface GetProviderOutboundNetworkUsageProps extends GetOutboundNetworkUsageProps {
  provider: InstanceProvider;
}
