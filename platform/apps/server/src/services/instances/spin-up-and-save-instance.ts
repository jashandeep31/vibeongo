import {
  getUserInstanceAutoTerminateMinutes,
  type InstanceAutoTerminateSetting,
} from "./get-user-instance-auto-terminate-minutes.js";
import type { InstanceRuntime } from "../../providers/types.js";

const SANDBOX_MAX_AUTO_TERMINATE_MINUTES = 40;

export const getValidatedAutoTerminateAfterInMinutes = async ({
  runtime,
  terminateAfterInMinutes,
  userId,
  terminateSetting,
}: {
  runtime: InstanceRuntime;
  terminateAfterInMinutes: number | undefined;
  userId: string;
  terminateSetting: InstanceAutoTerminateSetting;
}) => {
  const requestedMinutes =
    terminateAfterInMinutes ??
    (await getUserInstanceAutoTerminateMinutes(userId, terminateSetting));

  return runtime === "sandbox"
    ? Math.min(requestedMinutes, SANDBOX_MAX_AUTO_TERMINATE_MINUTES)
    : requestedMinutes;
};
