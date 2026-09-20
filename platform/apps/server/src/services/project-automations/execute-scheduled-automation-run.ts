import {
  and,
  asc,
  db,
  eq,
  isNull,
  projectAutomationRuns,
  projectAutomations,
  projectAutomationTasks,
  projectSessions,
  projectSessionTasks,
} from "@repo/db";
import { scheduleAutomatedInstanceLaunch } from "../instances/check-and-queue-instance-launch.js";

export async function executeScheduledAutomationRun(automationRunId: string) {
  const [record] = await db
    .select({
      automationId: projectAutomations.id,
      automationName: projectAutomations.name,
      projectId: projectAutomations.project_id,
      sessionId: projectAutomationRuns.project_session_id,
      scheduledFor: projectAutomationRuns.scheduled_for,
      userId: projectAutomations.user_id,
    })
    .from(projectAutomationRuns)
    .innerJoin(
      projectAutomations,
      eq(projectAutomations.id, projectAutomationRuns.project_automation_id),
    )
    .where(
      and(
        eq(projectAutomationRuns.id, automationRunId),
        eq(projectAutomationRuns.source, "schedule"),
        eq(projectAutomations.enabled, true),
        isNull(projectAutomations.deleted_at),
      ),
    )
    .limit(1);

  if (!record?.userId || !record.scheduledFor) {
    throw new Error("Scheduled automation run is unavailable");
  }
  const scheduledFor = record.scheduledFor;

  const tasks = await db
    .select()
    .from(projectAutomationTasks)
    .where(
      eq(projectAutomationTasks.project_automation_id, record.automationId),
    )
    .orderBy(asc(projectAutomationTasks.order_number));

  const sessionId = await db.transaction(async (tx) => {
    const [lockedRun] = await tx
      .select({ sessionId: projectAutomationRuns.project_session_id })
      .from(projectAutomationRuns)
      .where(eq(projectAutomationRuns.id, automationRunId))
      .for("update");

    if (!lockedRun) throw new Error("Scheduled automation run not found");
    if (lockedRun.sessionId) return lockedRun.sessionId;

    const readableRunAt = scheduledFor.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
    const [session] = await tx
      .insert(projectSessions)
      .values({
        project_id: record.projectId,
        name: `${record.automationName} — Scheduled run (${readableRunAt} UTC)`,
        description: `This session was created by the “${record.automationName}” schedule.`,
        started_at: new Date(),
        user_id: record.userId,
        overview: "",
        category: "auto",
      })
      .returning({ id: projectSessions.id });

    if (!session) throw new Error("Failed to create scheduled session");

    await tx.insert(projectSessionTasks).values(
      tasks.map((task) => ({
        project_session_id: session.id,
        folder_name: task.path_from_code,
        task: task.task_prompt,
        agent: task.agent,
        order_number: task.order_number,
        model: task.model,
      })),
    );
    await tx
      .update(projectAutomationRuns)
      .set({
        project_session_id: session.id,
        status: "allocating",
        error: null,
        updated_at: new Date(),
      })
      .where(eq(projectAutomationRuns.id, automationRunId));
    return session.id;
  });

  await scheduleAutomatedInstanceLaunch({
    userId: record.userId,
    sessionId,
    spinedUpBy: "automation",
    runtime: "sandbox",
    category: "auto",
  });

  await db
    .update(projectAutomations)
    .set({ last_run_at: new Date(), updated_at: new Date() })
    .where(eq(projectAutomations.id, record.automationId));
}
