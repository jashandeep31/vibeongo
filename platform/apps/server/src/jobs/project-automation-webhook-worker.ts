import { Worker } from "bullmq";
import {
  and,
  asc,
  db,
  eq,
  isNull,
  projectAutomations,
  projectAutomationRuns,
  projectAutomationTasks,
  projectAutomationTriggers,
  projectSessions,
  projectSessionTasks,
} from "@repo/db";
import { resolveProjectAutomationWebhookTasksAgent } from "../ai/ai-agents/resolve-project-automation-webhook-tasks-agent.js";
import { redis } from "../lib/valkey.js";
import { scheduleAutomatedInstanceLaunch } from "../services/instances/check-and-queue-instance-launch.js";
import {
  PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME,
  type ProjectAutomationWebhookJobData,
} from "./project-automation-webhook.js";

export const projectAutomationWebhookWorker =
  new Worker<ProjectAutomationWebhookJobData>(
    PROJECT_AUTOMATION_WEBHOOK_QUEUE_NAME,
    async (job) => {
      const startedAt = new Date();

      await db
        .update(projectAutomationRuns)
        .set({ status: "working", updated_at: startedAt, error: null })
        .where(eq(projectAutomationRuns.id, job.data.automationRunId));

      try {
        const [automation] = await db
          .select({
            id: projectAutomations.id,
            name: projectAutomations.name,
            project_id: projectAutomations.project_id,
            user_id: projectAutomations.user_id,
            trigger_name: projectAutomationTriggers.name,
            trigger_id: projectAutomationTriggers.id,
            input: projectAutomationRuns.input,
          })
          .from(projectAutomationRuns)
          .innerJoin(
            projectAutomations,
            eq(
              projectAutomations.id,
              projectAutomationRuns.project_automation_id,
            ),
          )
          .innerJoin(
            projectAutomationTriggers,
            eq(
              projectAutomationTriggers.id,
              projectAutomationRuns.project_automation_trigger_id,
            ),
          )
          .where(
            and(
              eq(projectAutomationRuns.id, job.data.automationRunId),
              eq(projectAutomationRuns.source, "webhook"),
              eq(
                projectAutomationTriggers.project_automation_id,
                projectAutomations.id,
              ),
              eq(projectAutomations.enabled, true),
              isNull(projectAutomations.deleted_at),
            ),
          )
          .limit(1);

        if (!automation) {
          throw new Error("Project automation or trigger not found");
        }
        if (!automation.user_id) {
          throw new Error("Project automation does not have a user");
        }

        const tasks = await db
          .select()
          .from(projectAutomationTasks)
          .where(
            eq(projectAutomationTasks.project_automation_id, automation.id),
          )
          .orderBy(asc(projectAutomationTasks.order_number));

        const resolvedTasks = await resolveProjectAutomationWebhookTasksAgent({
          input: automation.input ?? "{}",
          tasks,
        });

        const triggeredAt = new Date();
        const readableTriggeredAt = triggeredAt.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        });

        const projectSession = await db.transaction(async (tx) => {
          const [session] = await tx
            .insert(projectSessions)
            .values({
              project_id: automation.project_id,
              name: `${automation.name} — Webhook run (${readableTriggeredAt} UTC)`,
              description: `This session was created by the “${automation.trigger_name}” webhook integration for the “${automation.name}” automation.`,
              started_at: triggeredAt,
              user_id: automation.user_id,
              overview: "",
              category: "auto",
            })
            .returning();

          if (!session) throw new Error("Failed to create project session");

          await tx.insert(projectSessionTasks).values(
            resolvedTasks.map((task) => ({
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
              updated_at: triggeredAt,
            })
            .where(eq(projectAutomationRuns.id, job.data.automationRunId));

          await tx
            .update(projectAutomations)
            .set({ last_run_at: triggeredAt, updated_at: triggeredAt })
            .where(eq(projectAutomations.id, automation.id));

          await tx
            .update(projectAutomationTriggers)
            .set({ lasted_triggered_at: triggeredAt, updated_at: triggeredAt })
            .where(eq(projectAutomationTriggers.id, automation.trigger_id));

          return session;
        });

        await scheduleAutomatedInstanceLaunch({
          userId: automation.user_id,
          sessionId: projectSession.id,
          spinedUpBy: "automation",
          runtime: "sandbox",
          category: "auto",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Webhook processing failed";

        await db
          .update(projectAutomationRuns)
          .set({
            status: "failed",
            error: message.slice(0, 255),
            updated_at: new Date(),
          })
          .where(eq(projectAutomationRuns.id, job.data.automationRunId));

        throw error;
      }
    },
    {
      connection: redis.duplicate({ maxRetriesPerRequest: null }) as any,
      concurrency: 1,
    },
  );

projectAutomationWebhookWorker.on("error", (error) => {
  console.error("Project automation webhook worker error", error);
});
