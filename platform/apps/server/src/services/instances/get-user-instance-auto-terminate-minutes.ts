import {
  db,
  eq,
  userSettings,
} from "@repo/db";

export type InstanceAutoTerminateSetting = "issue" | "pr" | "manual";

const DEFAULT_AUTO_TERMINATE_MINUTES: Record<
  InstanceAutoTerminateSetting,
  number
> = {
  issue: 30,
  pr: 30,
  manual: 120,
};

export const getUserInstanceAutoTerminateMinutes = async (
  userId: string,
  setting: InstanceAutoTerminateSetting,
) => {
  const [settings] = await db
    .select({
      issue: userSettings.default_issue_instance_auto_terminate_after_minutes,
      pr: userSettings.default_pr_instance_auto_terminate_after_minutes,
      manual: userSettings.default_manual_instance_auto_terminate_after_minutes,
    })
    .from(userSettings)
    .where(eq(userSettings.user_id, userId));

  return settings?.[setting] ?? DEFAULT_AUTO_TERMINATE_MINUTES[setting];
};
