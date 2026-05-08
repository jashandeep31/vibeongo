import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  lt,
} from "@repo/db";
import cron from "node-cron";
import { terminateEc2Instance } from "../aws/services/terminate-ec2-instance.js";

console.log("cron started");

cron.schedule("*/3 * * * * *", async () => {
  try {
    console.log("cron job initiated");
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // instances older than 2hrs

    const rows = await db
      .select({ instanceRegions, instances })
      .from(instances)
      .leftJoin(instanceTypes, eq(instanceTypes.id, instances.instance_type_id))
      .leftJoin(
        instanceRegions,
        eq(instanceRegions.id, instanceTypes.region_id),
      )
      .where(
        and(lt(instances.created_at, cutoff), eq(instances.state, "running")),
      );

    for (const row of rows) {
      if (!row.instanceRegions) continue;
      await terminateEc2Instance(row.instanceRegions.slug, [
        row.instances.aws_instance_id,
      ]);
      await db
        .update(instances)
        .set({ terminated_at: new Date(), state: "terminated" })
        .where(eq(instances.id, row.instances.id));
    }
  } catch {}
});
