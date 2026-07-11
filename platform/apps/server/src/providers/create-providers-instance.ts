import { createAWSInstance } from "./aws/services/create-aws-instance.js";
import { createDigitalOceanInstance } from "./digitalocean/create-digitalocean-instance.js";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import type {
  AwsSupportedRegion,
  CreateInstanceProps,
  CreateInstanceProviderResponse,
  CreateProviderInstanceProps,
} from "./types.js";
import { AppError } from "../lib/app-error.js";
import { awsSupportedRegions } from "./aws/configs/aws-supported-regions-configs.js";
import { getInstancePublicAddress } from "./aws/services/get-instance-public-address.js";

export const createProviderInstance = async ({
  provider,
  region,
  instanceType,
  userData,
}: CreateProviderInstanceProps): Promise<CreateInstanceProviderResponse> => {
  const instanceName = generateInstanceName();

  switch (provider) {
    case "aws":
      return await createAwsProviderInstance({
        region,
        instanceType,
        userData,
        instanceName,
      });
    case "digitalocean":
      return await createDigitalOceanProviderInstance({
        provider,
        region,
        instanceType,
        userData,
        instanceName,
      });
    default:
      throw new AppError("Provider not found", 404);
  }
};

const generateInstanceName = () =>
  uniqueNamesGenerator({
    dictionaries: [colors, animals],
    style: "capital",
    separator: " ",
  });

const createAwsProviderInstance = async ({
  region,
  instanceType,
  userData,
  instanceName,
}: Omit<CreateInstanceProps, "provider">): Promise<CreateInstanceProviderResponse> => {
  assertAwsRegion(region);

  const res = await createAWSInstance({
    region,
    instanceType,
    userData,
  });
  const instance = res.Instances?.[0];

  if (!instance?.InstanceId) {
    throw new AppError("AWS instance not found after creation", 404);
  }

  const publicIpAddress = await getInstancePublicAddress(
    instance.InstanceId,
    region,
  );
  if (!publicIpAddress) {
    throw new AppError("AWS instance public IP address not found", 404);
  }

  return {
    instanceId: instance.InstanceId,
    instanceName,
    publicIPv4: publicIpAddress,
    pvtIPv4: instance.PrivateIpAddress ?? "",
  };
};

const createDigitalOceanProviderInstance = async ({
  provider,
  region,
  instanceType,
  userData,
  instanceName,
}: CreateInstanceProps & {
  provider: "digitalocean";
}): Promise<CreateInstanceProviderResponse> => {
  return await createDigitalOceanInstance({
    provider,
    region,
    instanceType,
    userData,
    instanceName,
  });
};

const assertAwsRegion: (
  region: string,
) => asserts region is AwsSupportedRegion = (region) => {
  if (!awsSupportedRegions.includes(region as AwsSupportedRegion)) {
    throw new AppError("AWS region is not supported", 404);
  }
};
