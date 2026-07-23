import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
  CreateSandboxProviderInstanceProps,
  CreateVmProviderInstanceProps,
  CreateProviderInstanceProps,
} from "./types.js";
import { AppError } from "../lib/app-error.js";
import { DigitalOceanClient } from "./digitalocean/digitalocean-client.js";
import { AWSClient } from "./aws/services/aws-client.js";
import { E2BClient } from "./e2b/e2b-client.js";

const digitaloceanClient = new DigitalOceanClient();
const awsInstancesClient = new AWSClient();
const e2bClient = new E2BClient();

export const createProviderInstance = async (
  props: CreateProviderInstanceProps,
): Promise<CreateInstanceProviderResponse> => {
  switch (props.runtime) {
    case "vm":
      return createVmProviderInstance(props);
    case "sandbox":
      return createSandboxProviderInstance(props);
  }
};

export const createSandboxProviderInstance = async ({
  provider,
  region,
  instanceType,
  userData,
  terminatedAfterInMinutes,
}: CreateSandboxProviderInstanceProps): Promise<CreateInstanceProviderResponse> => {
  const instance: CreateInstanceProps = {
    region,
    instanceType,
    userData,
    instanceName: generateInstanceName(),
    terminatedAfterInMinutes,
  };

  switch (provider) {
    case "e2b":
      return e2bClient.createInstance(instance);
    default:
      throw new AppError("Sandbox provider not found", 404);
  }
};

export const createVmProviderInstance = async ({
  provider,
  region,
  instanceType,
  userData,
  terminatedAfterInMinutes,
}: CreateVmProviderInstanceProps): Promise<CreateInstanceProviderResponse> => {
  const instance: CreateInstanceProps = {
    region,
    instanceType,
    userData,
    instanceName: generateInstanceName(),
    terminatedAfterInMinutes,
  };

  switch (provider) {
    case "aws":
      return await awsInstancesClient.createInstance(instance);
    case "digitalocean":
      return await digitaloceanClient.createInstance(instance);
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
