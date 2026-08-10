import { and, db, eq, instances, lt, sql } from "@repo/db";
import cron from "node-cron";
import { terminateInstanceAndChargeUsage } from "../services/instances/terminate-instance-and-charge-usage.js";

cron.schedule(
  "*/2 * * * *",
  async () => {
    console.log("Running expired instance termination job");

    let rows: Array<{
      id: string;
      userId: string;
      runtimeKind: "vm" | "sandbox";
    }>;
    try {
      rows = await db
        .select({
          id: instances.id,
          userId: instances.user_id,
          runtimeKind: instances.runtime_kind,
        })
        .from(instances)
        .where(
          and(
            lt(instances.terminates_at, sql`NOW()`),
            eq(instances.state, "running"),
          ),
        );
    } catch (error) {
      console.error("Could not load expired instances", error);
      return;
    }

    for (const row of rows) {
      try {
        await terminateInstanceAndChargeUsage({
          instanceId: row.id,
          userId: row.userId,
        });
        console.log(`Terminated expired ${row.runtimeKind} instance ${row.id}`);
      } catch (error) {
        console.error(
          `Could not terminate expired ${row.runtimeKind} instance ${row.id}`,
          error,
        );
      }
    }
  },
  {
    name: "terminate-expired-instances",
    noOverlap: true,
  },
);
