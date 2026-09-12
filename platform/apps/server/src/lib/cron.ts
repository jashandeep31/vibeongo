import {
  and,
  db,
  eq,
  gitRepoAccessTokens,
  instances,
  instanceSlots,
  isNull,
  lt,
  lte,
  sql,
} from "@repo/db";
import cron from "node-cron";
import { terminateInstanceAndChargeUsage } from "../services/instances/terminate-instance-and-charge-usage.js";
import { addGitRepoAccessTokenRevocationJob } from "../jobs/git-repo-access-token-revocation.js";

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

cron.schedule(
  "* * * * *",
  async () => {
    try {
      const recoveredSlots = await db
        .update(instanceSlots)
        .set({
          status: "failed",
          error: "Provisioning timed out before an instance was attached",
          updated_at: new Date(),
        })
        .where(
          and(
            eq(instanceSlots.status, "provisioning"),
            isNull(instanceSlots.instance_id),
            lt(
              sql`COALESCE(${instanceSlots.updated_at}, ${instanceSlots.created_at})`,
              sql`NOW() - INTERVAL '10 minutes'`,
            ),
          ),
        )
        .returning({ id: instanceSlots.id });

      if (recoveredSlots.length > 0) {
        console.log(
          `Marked ${recoveredSlots.length} stale provisioning slot(s) as failed`,
        );
      }
    } catch (error) {
      console.error("Could not recover stale provisioning slots", error);
    }
  },
  {
    name: "recover-stale-provisioning-slots",
    noOverlap: true,
  },
);

cron.schedule(
  "* * * * *",
  async () => {
    let rows: Array<{ id: string }>;
    try {
      rows = await db
        .select({ id: gitRepoAccessTokens.id })
        .from(gitRepoAccessTokens)
        .where(
          and(
            lte(gitRepoAccessTokens.expires_at, sql`NOW()`),
            isNull(gitRepoAccessTokens.revoked_at),
          ),
        )
        .limit(500);
    } catch (error) {
      console.error("Could not load expired Git access tokens", error);
      return;
    }

    for (const row of rows) {
      try {
        await addGitRepoAccessTokenRevocationJob({
          tokenId: row.id,
          reason: "expired",
        });
      } catch (error) {
        console.error(
          `Could not queue expired Git access token ${row.id}`,
          error,
        );
      }
    }
  },
  {
    name: "revoke-expired-git-access-tokens",
    noOverlap: true,
  },
);
