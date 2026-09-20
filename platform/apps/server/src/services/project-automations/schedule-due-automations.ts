import {
  and,
  asc,
  automationScheduleOutbox,
  db,
  eq,
  isNotNull,
  isNull,
  lte,
  projectAutomationRuns,
  projectAutomations,
  sql,
} from "@repo/db";
import { addProjectAutomationScheduleJob } from "../../jobs/project-automation-schedule.js";
import { getNextAutomationRun } from "./get-next-automation-run.js";

const BATCH_SIZE = 100;

export async function claimDueProjectAutomations() {
  return await db.transaction(async (tx) => {
    const due = await tx
      .select({
        cronExpression: projectAutomations.cron_expression,
        id: projectAutomations.id,
        nextRunAt: projectAutomations.next_run_at,
        timezone: projectAutomations.timezone,
      })
      .from(projectAutomations)
      .where(
        and(
          eq(projectAutomations.enabled, true),
          isNull(projectAutomations.deleted_at),
          sql`${projectAutomations.cron_expression} <> ''`,
          isNotNull(projectAutomations.next_run_at),
          lte(projectAutomations.next_run_at, new Date()),
        ),
      )
      .orderBy(asc(projectAutomations.next_run_at))
      .limit(BATCH_SIZE)
      .for("update", { skipLocked: true });

    let created = 0;
    for (const automation of due) {
      if (
        !automation.cronExpression ||
        !automation.timezone ||
        !automation.nextRunAt
      ) {
        continue;
      }

      const nextRunAt = getNextAutomationRun(
        automation.cronExpression,
        automation.timezone,
      );
      if (!nextRunAt) continue;

      const [run] = await tx
        .insert(projectAutomationRuns)
        .values({
          project_automation_id: automation.id,
          scheduled_for: automation.nextRunAt,
          source: "schedule",
          status: "queued",
        })
        .onConflictDoNothing()
        .returning({ id: projectAutomationRuns.id });

      await tx
        .update(projectAutomations)
        .set({ next_run_at: nextRunAt, updated_at: new Date() })
        .where(eq(projectAutomations.id, automation.id));

      if (run) {
        await tx.insert(automationScheduleOutbox).values({
          automation_run_id: run.id,
        });
        created += 1;
      }
    }
    return created;
  });
}

export async function dispatchAutomationScheduleOutbox() {
  const pending = await db
    .select({
      automationId: projectAutomationRuns.project_automation_id,
      outboxId: automationScheduleOutbox.id,
      runId: automationScheduleOutbox.automation_run_id,
      scheduledFor: projectAutomationRuns.scheduled_for,
    })
    .from(automationScheduleOutbox)
    .innerJoin(
      projectAutomationRuns,
      eq(projectAutomationRuns.id, automationScheduleOutbox.automation_run_id),
    )
    .where(isNull(automationScheduleOutbox.delivered_at))
    .orderBy(asc(automationScheduleOutbox.created_at))
    .limit(BATCH_SIZE);

  let delivered = 0;
  for (const item of pending) {
    if (!item.automationId || !item.scheduledFor) continue;
    try {
      await addProjectAutomationScheduleJob({
        automationId: item.automationId,
        automationRunId: item.runId,
        scheduledFor: item.scheduledFor,
      });
      await db
        .update(automationScheduleOutbox)
        .set({ delivered_at: new Date(), last_error: null })
        .where(eq(automationScheduleOutbox.id, item.outboxId));
      delivered += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enqueue run";
      await db
        .update(automationScheduleOutbox)
        .set({
          attempts: sql`${automationScheduleOutbox.attempts} + 1`,
          last_error: message.slice(0, 500),
        })
        .where(eq(automationScheduleOutbox.id, item.outboxId));
    }
  }
  return delivered;
}
