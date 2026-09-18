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
  projectAutomationTriggerRuns,
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
        .update(projectAutomationTriggerRuns)
        .set({ status: "working", updated_at: startedAt, error: null })
        .where(
          and(
            eq(projectAutomationTriggerRuns.id, job.data.automationTriggerRunId),
            eq(
              projectAutomationTriggerRuns.project_automation_trigger_id,
              job.data.automationTriggerId,
            ),
          ),
        );

      try {
        const [automation] = await db
          .select({
            id: projectAutomations.id,
            name: projectAutomations.name,
            project_id: projectAutomations.project_id,
            user_id: projectAutomations.user_id,
            trigger_name: projectAutomationTriggers.name,
          })
          .from(projectAutomations)
          .innerJoin(
            projectAutomationTriggers,
            eq(
              projectAutomationTriggers.project_automation_id,
              projectAutomations.id,
            ),
          )
          .where(
            and(
              eq(projectAutomations.id, job.data.automationId),
              eq(projectAutomationTriggers.id, job.data.automationTriggerId),
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
          input: job.data.input,
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

          await tx.insert(projectAutomationRuns).values({
            project_automation_id: automation.id,
            project_session_id: session.id,
          });

          await tx
            .update(projectAutomationTriggerRuns)
            .set({
              project_session_id: session.id,
              status: "allocating",
              updated_at: triggeredAt,
            })
            .where(
              eq(
                projectAutomationTriggerRuns.id,
                job.data.automationTriggerRunId,
              ),
            );

          await tx
            .update(projectAutomations)
            .set({ last_run_at: triggeredAt, updated_at: triggeredAt })
            .where(eq(projectAutomations.id, automation.id));

          await tx
            .update(projectAutomationTriggers)
            .set({ lasted_triggered_at: triggeredAt, updated_at: triggeredAt })
            .where(eq(projectAutomationTriggers.id, job.data.automationTriggerId));

          return session;
        });

        await scheduleAutomatedInstanceLaunch({
          userId: automation.user_id,
          sessionId: projectSession.id,
          spinedUpBy: "issue",
          runtime: "sandbox",
          category: "auto",
        });

      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Webhook processing failed";

        await db
          .update(projectAutomationTriggerRuns)
          .set({
            status: "failed",
            error: message.slice(0, 255),
            updated_at: new Date(),
          })
          .where(eq(projectAutomationTriggerRuns.id, job.data.automationTriggerRunId));

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
