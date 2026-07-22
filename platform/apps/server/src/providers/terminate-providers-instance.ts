import { AppError } from "../lib/app-error.js";
import { AWSClient } from "./aws/services/aws-client.js";
import { DigitalOceanClient } from "./digitalocean/digitalocean-client.js";
import type {
  TerminateProviderInstanceProps,
  TerminateProviderInstanceResponse,
} from "./types.js";

const awsClient = new AWSClient();
const digitalOceanClient = new DigitalOceanClient();

export const terminateProviderInstance = async ({
  provider,
  region,
  instanceId,
  runtime,
}: TerminateProviderInstanceProps): Promise<TerminateProviderInstanceResponse> => {
  switch (runtime) {
    case "ec2":
      return terminateEc2ProviderInstance({ provider, region, instanceId });
    case "sandbox":
      throw new AppError("Sandbox instance termination is not supported", 501);
  }
};

const terminateEc2ProviderInstance = async ({
  provider,
  region,
  instanceId,
}: Omit<TerminateProviderInstanceProps, "runtime">): Promise<TerminateProviderInstanceResponse> => {
  switch (provider) {
    case "aws": {
      const response = await awsClient.terminateInstance(region, [instanceId]);
      const termination = response.TerminatingInstances?.find(
        (terminatedInstance) => terminatedInstance.InstanceId === instanceId,
      );
      const state = termination?.CurrentState?.Name;

      if (
        response.$metadata.httpStatusCode !== 200 ||
        (state !== "shutting-down" && state !== "terminated")
      ) {
        throw new AppError("Failed to terminate AWS instance", 502);
      }

      return { terminated: true };
    }
    case "digitalocean": {
      const response = await digitalOceanClient.terminateInstance({ instanceId });

      if (response.status !== 204) {
        throw new AppError("Failed to terminate DigitalOcean instance", 502);
      }

      return { terminated: true };
    }
    default:
      throw new AppError("Provider not found", 404);
  }
};
