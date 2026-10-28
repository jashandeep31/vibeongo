import {
  and,
  db,
  desc,
  eq,
  inArray,
  instances,
  instanceSlots,
  projectSessionTasks,
  sandboxTypes,
} from "@repo/db";
import {
  supportsInstanceTimeExtension,
  supportsSandboxSuspension,
  MAX_BOAT_EXTENSION_MINUTES,
} from "@repo/shared/providers";
import { AppError } from "../../lib/app-error.js";
import { addTerminateOrPauseInstanceJob } from "../../jobs/terminate-or-pause-instance.js";
import { runInstanceActionWithLock } from "../instances/instance-lifecycle.js";
import { resumeSuspendedSession } from "../instances/resume-suspended-session.js";
import { updateInstanceExpiration } from "../instances/update-instance-expiration.js";
import { getManualSession, getOwnedSession } from "./session-access.js";
import { startManualSession } from "./start-manual-session.js";

type Instance = Pick<
  typeof instances.$inferSelect,
  | "id"
  | "name"
  | "state"
  | "runtime_kind"
  | "started_at"
  | "terminates_at"
  | "terminated_at"
>;

export function runtimeSummary(instance: Instance) {
  return {
    id: instance.id,
    name: instance.name,
    state: instance.state,
    runtime: instance.runtime_kind,
    startedAt: instance.started_at,
    expiresAt: instance.terminates_at,
    terminatedAt: instance.terminated_at,
    remainingSeconds:
      instance.state === "running"
        ? Math.max(
            0,
            Math.floor((instance.terminates_at.getTime() - Date.now()) / 1000),
          )
        : 0,
  };
}

async function getSessionInstance(
  userId: string,
  sessionId: string,
  instanceId: string,
) {
  const [instance] = await db
    .select({
      id: instances.id,
      name: instances.name,
      state: instances.state,
      runtime_kind: instances.runtime_kind,
      started_at: instances.started_at,
      terminates_at: instances.terminates_at,
      terminated_at: instances.terminated_at,
    })
    .from(instances)
    .where(
      and(
        eq(instances.id, instanceId),
        eq(instances.user_id, userId),
        eq(instances.project_session_id, sessionId),
      ),
    )
    .limit(1);
  if (!instance) throw new AppError("Instance not found in this session", 404);
  return instance;
}

export async function getSessionContext(userId: string, sessionId: string) {
  const { session, projectName } = await getOwnedSession(userId, sessionId);
  const [runtimeRows, tasks, slots] = await Promise.all([
    db
      .select({
        id: instances.id,
        name: instances.name,
        state: instances.state,
        runtime_kind: instances.runtime_kind,
        started_at: instances.started_at,
        terminates_at: instances.terminates_at,
        terminated_at: instances.terminated_at,
        sandbox_type_id: instances.sandbox_type_id,
        provider: sandboxTypes.provider,
      })
      .from(instances)
      .leftJoin(sandboxTypes, eq(sandboxTypes.id, instances.sandbox_type_id))
      .where(
        and(
          eq(instances.project_session_id, sessionId),
          eq(instances.user_id, userId),
        ),
      )
      .orderBy(desc(instances.started_at), desc(instances.id)),
    db
      .select({
        id: projectSessionTasks.id,
        task: projectSessionTasks.task,
        folderName: projectSessionTasks.folder_name,
        agent: projectSessionTasks.agent,
        model: projectSessionTasks.model,
        done: projectSessionTasks.done,
      })
      .from(projectSessionTasks)
      .where(eq(projectSessionTasks.project_session_id, sessionId))
      .orderBy(projectSessionTasks.order_number),
    db
      .select({
        id: instanceSlots.id,
        status: instanceSlots.status,
        instanceId: instanceSlots.instance_id,
        runtime: instanceSlots.runtime_kind,
      })
      .from(instanceSlots)
      .where(
        and(
          eq(instanceSlots.session_id, sessionId),
          eq(instanceSlots.user_id, userId),
        ),
      )
      .orderBy(desc(instanceSlots.created_at))
      .limit(1),
  ]);
  const active = runtimeRows.filter((row) => row.state !== "terminated");
  return {
    session: {
      id: session.id,
      projectId: session.project_id,
      projectName,
      name: session.name,
      description: session.description,
      overview: session.overview,
      category: session.category,
      archived: session.archived,
      createdAt: session.created_at,
    },
    checkedAt: new Date(),
    tasks,
    latestSlot: slots[0] ?? null,
    instances: active.map((instance) => ({
      ...runtimeSummary(instance),
      provider: instance.provider,
      canPause:
        session.category === "manual" &&
        !session.archived &&
        instance.state === "running" &&
        instance.runtime_kind === "sandbox" &&
        supportsSandboxSuspension(instance.provider),
      canExtendTime:
        session.category === "manual" &&
        !session.archived &&
        instance.state === "running" &&
        instance.terminates_at.getTime() > Date.now() &&
        supportsInstanceTimeExtension(
          instance,
          instance.sandbox_type_id && instance.provider
            ? { id: instance.sandbox_type_id, provider: instance.provider }
            : null,
        ),
      maxExtensionMinutes:
        instance.provider === "boat" ? MAX_BOAT_EXTENSION_MINUTES : null,
    })),
    latestInstance: runtimeRows[0] ? runtimeSummary(runtimeRows[0]) : null,
  };
}

export async function resumeManualSession(
  userId: string,
  sessionId: string,
  runtime?: "vm" | "sandbox",
) {
  await getManualSession(userId, sessionId);
  const [active] = await db
    .select({
      id: instances.id,
      state: instances.state,
      runtime: instances.runtime_kind,
    })
    .from(instances)
    .where(
      and(
        eq(instances.project_session_id, sessionId),
        eq(instances.user_id, userId),
        inArray(instances.state, ["running", "suspended"]),
      ),
    )
    .orderBy(desc(instances.started_at))
    .limit(1);
  if (active?.state === "running")
    throw new AppError("This session already has a running instance", 409);
  if (active?.state === "suspended") {
    if (runtime && runtime !== active.runtime)
      throw new AppError(
        "Resume must keep the suspended instance's runtime",
        409,
      );
    await resumeSuspendedSession({ userId, sessionId });
    return {
      sessionId,
      instanceId: active.id,
      status: "restarting",
      message:
        "Instance resumed; its runtime is restarting in the background. Wait at least 60 seconds before using SSH or OpenCode, then check get_session_context. Setup may take longer; a running state alone does not guarantee readiness.",
    };
  }
  const instance = await startManualSession(
    userId,
    sessionId,
    runtime ?? "sandbox",
  );
  return {
    sessionId,
    instance: runtimeSummary(instance),
    status: "starting",
    message:
      "Instance created. Wait at least 60 seconds for project setup before using SSH or OpenCode, then check get_session_context. Setup may take longer; a running state alone does not guarantee readiness.",
  };
}

export async function extendManualSessionTime(
  userId: string,
  input: {
    sessionId: string;
    instanceId: string;
    timeInMinutes: number;
    requestId: string;
  },
) {
  await getManualSession(userId, input.sessionId);
  await getSessionInstance(userId, input.sessionId, input.instanceId);
  const instance = await updateInstanceExpiration({
    id: input.instanceId,
    userId,
    action: "increase",
    timeInMinutes: input.timeInMinutes,
    requestId: input.requestId,
  });
  return {
    sessionId: input.sessionId,
    requestId: input.requestId,
    instance: runtimeSummary(instance),
  };
}

export async function changeManualSessionState(
  userId: string,
  input: {
    sessionId: string;
    instanceId: string;
    action: "pause" | "terminate";
  },
) {
  await getManualSession(userId, input.sessionId);
  const instance = await getSessionInstance(
    userId,
    input.sessionId,
    input.instanceId,
  );
  if (input.action === "pause" && instance.state === "terminated") {
    throw new AppError("A terminated instance cannot be paused", 409);
  }
  const lock = await runInstanceActionWithLock({
    userId,
    instanceId: input.instanceId,
    action: input.action,
  });
  if (!lock.acquired) {
    await addTerminateOrPauseInstanceJob({
      instanceId: input.instanceId,
      action: input.action,
      delayInMinutes: 1,
    });
  }
  return {
    sessionId: input.sessionId,
    instanceId: input.instanceId,
    action: input.action,
    status: lock.acquired ? "completed" : "queued",
    message: lock.acquired
      ? input.action === "pause"
        ? "Instance suspended successfully"
        : "Instance terminated successfully"
      : "Request queued for processing. Check get_session_context for the actual state.",
  };
}
