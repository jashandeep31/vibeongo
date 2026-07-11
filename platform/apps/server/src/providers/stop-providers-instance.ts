import { instanceProvidersEnum } from "@repo/db";

interface stopProviderInstanceProps {
  provider: (typeof instanceProvidersEnum.enumValues)[number];
  region: string;
  instanceId: string;
}
export const stopProviderInstance = async ({
  provider,
  region,
  instanceId,
}: stopProviderInstanceProps) => {
  switch (provider) {
    case "aws": {
    }
    case "digitalocean": {
    }
  }
};
