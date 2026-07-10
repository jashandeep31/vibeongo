import { instanceProvidersEnum } from "@repo/db";
import { createAWSInstance } from "./aws/services/create-aws-instance.js";
import { createDigitalOceanInstance } from "./digitalocean/create-digitalocean-instance.js";
import { animals, colors, uniqueNamesGenerator } from "unique-names-generator";

export interface createInstanceProps {
  instanceName: string;
  provider: (typeof instanceProvidersEnum.enumValues)[number];
  region: string;
  instanceType: string;
  userData: string;
}
export const createProviderInstance = async ({
  instanceName,
  provider,
  region,
  instanceType,
  userData,
}: createInstanceProps) => {
  const instanceName = uniqueNamesGenerator({
    dictionaries: [colors, animals],
    style: "capital",
    separator: " ",
  });

  switch (provider) {
    case "aws":
      await createAWSInstance({
        region: region as any,
        instanceType,
        userData,
      });

    case "digitalocean":
      await createDigitalOceanInstance({
        region: region,
        provider,
        instanceType,
        userData,
        instanceName: "",
      });
  }
};
