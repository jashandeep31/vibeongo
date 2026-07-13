import { AppError } from "../lib/app-error.js";
import { AWSClient } from "./aws/services/aws-client.js";
import { DigitalOceanClient } from "./digitalocean/digitalocean-client.js";
import type { TerminateProviderInstanceProps } from "./types.js";

const awsClient = new AWSClient();
const digitalOceanClient = new DigitalOceanClient();

export const terminateProviderInstance = async ({
  provider,
  region,
  instanceId,
}: TerminateProviderInstanceProps): Promise<void> => {
  switch (provider) {
    case "aws":
      await awsClient.terminateInstance(region, [instanceId]);
      return;
    case "digitalocean":
      await digitalOceanClient.terminateInstance({ instanceId });
      return;
    default:
      throw new AppError("Provider not found", 404);
  }
};
