import { instanceProvidersEnum } from "@repo/db";

export interface createInstanceProps {
  instanceName: string;
  provider: (typeof instanceProvidersEnum.enumValues)[number];
  region: string;
  instanceType: string;
  userData: string;
}
