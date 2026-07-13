import { instanceProvidersEnum } from "@repo/db";
import { awsSupportedRegions } from "./aws/configs/aws-supported-regions-configs.js";

export type InstanceProvider =
  (typeof instanceProvidersEnum.enumValues)[number];
export type AwsSupportedRegion = (typeof awsSupportedRegions)[number];

export interface CreateProviderInstanceProps {
  provider: InstanceProvider;
  region: string;
  instanceType: string;
  userData: string;
}

export interface CreateAwsInstanceProps
  extends Omit<CreateInstanceProps, "region"> {
  region: AwsSupportedRegion;
}

export interface CreateInstanceProps
  extends Omit<CreateProviderInstanceProps, "provider"> {
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
