import { AppError } from "../lib/app-error.js";
import { AWSClient } from "./aws/services/aws-client.js";
import { DigitalOceanClient } from "./digitalocean/digitalocean-client.js";
import type { GetProviderOutboundNetworkUsageProps } from "./types.js";

const awsClient = new AWSClient();
const digitalOceanClient = new DigitalOceanClient();

export const getProviderOutboundNetworkUsage = async ({
  provider,
  region,
  instanceId,
  startTime,
  endTime,
}: GetProviderOutboundNetworkUsageProps): Promise<number> => {
  const props = { region, instanceId, startTime, endTime };
  let networkUsageInBytes: number;

  switch (provider) {
    case "aws":
      networkUsageInBytes = await awsClient.getOutboundNetworkUsage(props);
      break;
    case "digitalocean":
      networkUsageInBytes =
        await digitalOceanClient.getOutboundNetworkUsage(props);
      break;
    default:
      throw new AppError("Provider not found", 404);
  }

  return networkUsageInBytes / 1_073_741_824;
};
