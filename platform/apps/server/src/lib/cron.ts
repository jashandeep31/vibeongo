import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  lt,
  projectDomainRouting,
  sql,
} from "@repo/db";
import cron from "node-cron";
import { terminateEc2Instance } from "../aws/services/terminate-ec2-instance.js";
import { invalidateProjectProxiesByRoutingId } from "./invalidate-project-proxies-by-pid.js";

cron.schedule("*/5 * * * *", async () => {
  try {
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
          lt(instances.created_at, sql`NOW() - INTERVAL '2 hours'`),
          eq(instances.state, "running"),
        ),
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

      const updatedRoutings = await db
        .update(projectDomainRouting)
        .set({
          target_instance_id: null,
        })
        .where(eq(projectDomainRouting.target_instance_id, row.instances.id))
        .returning({ id: projectDomainRouting.id });

      for (const routing of updatedRoutings) {
        await invalidateProjectProxiesByRoutingId(routing.id);
      }
    }
  } catch (e) {
    console.log(e);
  }
});
