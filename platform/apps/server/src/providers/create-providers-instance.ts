import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";
import type {
  CreateInstanceProps,
  CreateInstanceProviderResponse,
  CreateProviderInstanceProps,
} from "./types.js";
import { AppError } from "../lib/app-error.js";
import { DigitalOceanClient } from "./digitalocean/digitalocean-client.js";
import { AWSClient } from "./aws/services/aws-client.js";

const digitaloceanClient = new DigitalOceanClient();
const awsInstancesClient = new AWSClient();

export const createProviderInstance = async ({
  provider,
  region,
  instanceType,
  userData,
}: CreateProviderInstanceProps): Promise<CreateInstanceProviderResponse> => {
  const instance: CreateInstanceProps = {
    region,
    instanceType,
    userData,
    instanceName: generateInstanceName(),
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
