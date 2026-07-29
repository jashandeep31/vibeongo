import { AppError } from "../lib/app-error.js";
import { AWSClient } from "./client/aws-client.js";
import { DigitalOceanClient } from "./client/digitalocean-client.js";
import { E2BClient } from "./client/e2b-client.js";
import { DaytonaClient } from "./client/daytona-client.js";
import { VercelSandboxClient } from "./client/vercel-sandbox-client.js";
import type {
  TerminateProviderInstanceProps,
  TerminateProviderInstanceResponse,
} from "./types.js";

const awsClient = new AWSClient();
const digitalOceanClient = new DigitalOceanClient();
const e2bClient = new E2BClient();
const daytonaClient = new DaytonaClient();
const vercelClient = new VercelSandboxClient();

export const terminateProviderInstance = async ({
  provider,
  region,
  instanceId,
  runtime,
}: TerminateProviderInstanceProps): Promise<TerminateProviderInstanceResponse> => {
  switch (runtime) {
    case "vm":
      return terminateEc2ProviderInstance({ provider, region, instanceId });
    case "sandbox":
      return terminateSandboxInstance({ provider, instanceId });
  }
};

const terminateSandboxInstance = async ({
  provider,
  instanceId,
}: Pick<
  TerminateProviderInstanceProps,
  "provider" | "instanceId"
>): Promise<TerminateProviderInstanceResponse> => {
  const terminated = await (() => {
    switch (provider) {
      case "e2b":
        return e2bClient.terminateInstance(instanceId);
      case "daytona":
        return daytonaClient.terminateInstance(instanceId);
      case "vercel":
        return vercelClient.terminateInstance(instanceId);
      default:
        throw new AppError("Sandbox provider not found", 404);
    }
  })();

  if (!terminated) {
    throw new AppError("Failed to terminate sandbox", 502);
  }

  return { terminated: true };
};

const terminateEc2ProviderInstance = async ({
  provider,
  region,
  instanceId,
}: Omit<
  TerminateProviderInstanceProps,
  "runtime"
>): Promise<TerminateProviderInstanceResponse> => {
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
      const response = await digitalOceanClient.terminateInstance({
        instanceId,
      });

      if (response.status !== 204) {
        throw new AppError("Failed to terminate DigitalOcean instance", 502);
      }

      return { terminated: true };
    }
    default:
      throw new AppError("Provider not found", 404);
  }
};
