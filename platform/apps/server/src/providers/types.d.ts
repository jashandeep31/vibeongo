import { instanceProvidersEnum } from "@repo/db";

export interface createInstanceProps<T> {
  instanceName: string;
  provider: (typeof instanceProvidersEnum.enumValues)[number];
  region: T[number];
  instanceType: string;
  userData: string;
}
