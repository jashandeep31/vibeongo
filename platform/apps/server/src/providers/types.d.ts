import {
  instanceProvidersEnum,
  instanceRuntimeKind,
  sandboxProvidersEnums,
} from "@repo/db";
import { awsSupportedRegions } from "./aws/configs/aws-supported-regions-configs.js";

export type InstanceProvider =
  (typeof instanceProvidersEnum.enumValues)[number];
export type SandboxProvider =
  (typeof sandboxProvidersEnums.enumValues)[number];
export type InstanceRuntime =
  (typeof instanceRuntimeKind.enumValues)[number];
export type AwsSupportedRegion = (typeof awsSupportedRegions)[number];

export interface CreateProviderInstanceBaseProps {
  region: string;
  instanceType: string;
  userData: string;
}

export interface CreateVmProviderInstanceProps
  extends CreateProviderInstanceBaseProps {
  provider: InstanceProvider;
  runtime: "vm";
}

export interface CreateSandboxProviderInstanceProps
  extends CreateProviderInstanceBaseProps {
  provider: SandboxProvider;
  runtime: "sandbox";
}

export type CreateProviderInstanceProps =
  | CreateVmProviderInstanceProps
  | CreateSandboxProviderInstanceProps;

export interface CreateInstanceProps extends CreateProviderInstanceBaseProps {
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
