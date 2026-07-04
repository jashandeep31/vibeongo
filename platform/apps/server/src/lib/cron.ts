import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  lt,
  sql,
} from "@repo/db";
import cron from "node-cron";
import { terminateInstanceAndChargeUsageWithInstanceIdAndSessionId } from "../services/instances/terminate-instance-and-charge-usage.js";

cron.schedule("*/2 * * * *", async () => {
  try {
    console.log("running cron");
    const rows = await db
      .select({ instanceRegions, instances })
      .from(instances)
      .leftJoin(instanceTypes, eq(instanceTypes.id, instances.instance_type_id))
      .leftJoin(
        instanceRegions,
        eq(instanceRegions.id, instanceTypes.region_id),
      )
      .where(
        and(
          lt(instances.terminates_at, sql`NOW()`),
          eq(instances.state, "running"),
        ),
      );

    for (const row of rows) {
      if (!row.instanceRegions) continue;

      await terminateInstanceAndChargeUsageWithInstanceIdAndSessionId({
        instanceId: row.instances.id,
        sessionId: "iawareofshit",
      });
    }
  } catch (e) {
    console.log(e);
  }
});
