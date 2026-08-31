import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceSlotInstanceCategory,
  instanceTypes,
  projects,
  projectSshKeys,
  sandboxRegions,
  sandboxTypes,
  sshKeys,
} from "@repo/db";
import { AppError } from "../../lib/app-error.js";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";
import { InstanceRuntime } from "../../providers/types.js";
import { InstanceAutoTerminateSetting } from "./get-user-instance-auto-terminate-minutes.js";
import { getValidatedAutoTerminateAfterInMinutes } from "./spin-up-and-save-instance.js";
import { setupInstanceScript } from "../../scripts/setup-instance-script.js";
import { createProviderInstance } from "../../providers/create-providers-instance.js";
import { getProxyServerUrl } from "../../lib/proxy-servers.js";
import { createOpenRouterVirtualKeyAndSave } from "../openrouter/index.js";

type ProviderInstance = Awaited<ReturnType<typeof createProviderInstance>>;

type ProvisionedInstance =
  | {
      runtime: "vm";
      instance: ProviderInstance;
      instanceTypeId: string;
      sandboxTypeId: null;
    }
  | {
      runtime: "sandbox";
      instance: ProviderInstance;
      instanceTypeId: null;
      sandboxTypeId: string;
    };

interface SpinUpAndSaveInstanceV2 {
  userId: string;
  projectId: string;
  sessionId: string;
  runtime: InstanceRuntime;
  spinedUpBy: InstanceAutoTerminateSetting;
  category: (typeof instanceSlotInstanceCategory.enumValues)[number];
}

export const spinUpAndSaveInstanceV2 = async ({
  userId,
  sessionId,
  projectId,
  spinedUpBy,
  runtime,
  category,
}: SpinUpAndSaveInstanceV2) => {
  const sessionToken = `vps_${createId()}${crypto.randomBytes(16).toString("hex")}`;
  const instanceId = crypto.randomUUID();

  const autoTerminateAfterInMinutes =
    await getValidatedAutoTerminateAfterInMinutes({
      runtime,
      terminateAfterInMinutes: undefined,
      userId,
      terminateSetting: spinedUpBy,
    });

  const projectRowWithSSHkeys = await db
    .select({
      project: projects,
      sshKey: sshKeys,
    })
    .from(projects)
    .leftJoin(projectSshKeys, eq(projectSshKeys.project_id, projects.id))
    .leftJoin(sshKeys, eq(sshKeys.id, projectSshKeys.ssh_key_id))
    .where(and(eq(projects.id, projectId), eq(projects.user_id, userId)));
  const project = projectRowWithSSHkeys[0]?.project;
  const sshKeysArray: string[] = [];
  for (const item of projectRowWithSSHkeys) {
    if (item.sshKey) {
      sshKeysArray.push(item.sshKey.value);
    }
  }
  if (!project) throw new AppError("Project not found ", 404);
  const provisionedInstance: ProvisionedInstance | null = await (async () => {
    if (runtime == "vm") {
      return await handleVmRuntime({
        project,
        instanceId,
        sessionToken,
        sshKeysArray,
        sessionId,
        terminateAfterInMinutes: autoTerminateAfterInMinutes,
      });
    }
    return await handlesandboxRuntime({
      project,
      instanceId,
      sessionToken,
      sshKeysArray,
      sessionId,
      terminateAfterInMinutes: autoTerminateAfterInMinutes,
    });
  })();
  if (!provisionedInstance) {
    throw new AppError("failed to create instance", 500);
  }

  const {
    instance: newInstance,
    instanceTypeId,
    sandboxTypeId,
  } = provisionedInstance;

  const [instance] = await db
    .insert(instances)
    .values({
      name: newInstance.instanceName,
      id: instanceId,
      project_id: project.id,
      user_id: userId,
      runtime_kind: provisionedInstance.runtime,
      instance_type_id: instanceTypeId,
      sandbox_type_id: sandboxTypeId,
      provider_instance_id: newInstance.instanceId,
      proxy_domain: await getProxyServerUrl(project.id),
      terminated_at: null,
      terminates_at: new Date(
        new Date().getTime() + autoTerminateAfterInMinutes * 60 * 1000,
      ),
      started_at: new Date(),
      public_ip: newInstance.publicIPv4,
      state: "running",
      project_session_id: sessionId,
      access_token: createId(),
      config: {
        opencodePassword: createId(),
        terminate: false,
        vibeongoLocalToken: createId(),
        sessionToken: sessionToken,
      },
    })
    .returning();

  if (!instance) {
    throw new AppError("Failed to create instance", 500);
  }

  // TODO: look for a better way
  await createOpenRouterVirtualKeyAndSave({
    instanceId: instance.id,
    limit_in_dollars: 5,
    expires_after_in_minutes: autoTerminateAfterInMinutes,
  });
  return instance;
};

const handleVmRuntime = async ({
  project,
  instanceId,
  sessionToken,
  sshKeysArray,
  sessionId,

  terminateAfterInMinutes,
}: {
  project: typeof projects.$inferSelect;
  instanceId: string;
  sshKeysArray: string[];
  sessionId: string;
  sessionToken: string;
  terminateAfterInMinutes: number;
}): Promise<Extract<ProvisionedInstance, { runtime: "vm" }>> => {
  const [instanceTypeWithRegion] = await db
    .select({ instanceType: instanceTypes, region: instanceRegions })
    .from(instanceTypes)
    .innerJoin(instanceRegions, eq(instanceRegions.id, instanceTypes.region_id))
    .where(eq(instanceTypes.id, project.instance_type_id));

  if (!instanceTypeWithRegion?.region || !instanceTypeWithRegion.instanceType) {
    throw new AppError("VM instance type not found", 404);
  }

  const setupScript = setupInstanceScript({
    sshKey: sshKeysArray.join("\n"),
    authToken: sessionToken,
    projectSessionId: sessionId,
    instanceId,
  });
  return {
    runtime: "vm",
    instance: await createProviderInstance({
      provider: instanceTypeWithRegion.instanceType.provider,
      region: instanceTypeWithRegion.region.slug,
      instanceType: instanceTypeWithRegion.instanceType.slug,
      runtime: "vm",
      userData: setupScript,
      terminatedAfterInMinutes: terminateAfterInMinutes,
    }),
    instanceTypeId: instanceTypeWithRegion.instanceType.id,
    sandboxTypeId: null,
  };
};
const handlesandboxRuntime = async ({
  project,
  instanceId,
  sessionToken,
  sshKeysArray,
  sessionId,
  terminateAfterInMinutes,
}: {
  project: typeof projects.$inferSelect;
  instanceId: string;
  sshKeysArray: string[];
  sessionId: string;
  sessionToken: string;
  terminateAfterInMinutes: number;
}): Promise<Extract<ProvisionedInstance, { runtime: "sandbox" }> | null> => {
  const [row] = await db
    .select({ sandboxType: sandboxTypes, region: sandboxRegions })
    .from(sandboxTypes)
    .innerJoin(
      sandboxRegions,
      eq(sandboxRegions.id, sandboxTypes.sandbox_region),
    )
    .where(eq(sandboxTypes.id, project.sandbox_type_id));

  if (!row?.region || !row.sandboxType) {
    return null;
  }

  const setupScript = setupInstanceScript({
    sshKey: sshKeysArray.join("\n"),
    authToken: sessionToken,
    projectSessionId: sessionId,
    instanceId,
  });
  return {
    runtime: "sandbox",
    instance: await createProviderInstance({
      provider: row.sandboxType.provider,
      region: row.region.slug,
      instanceType: row.sandboxType.slug,
      runtime: "sandbox",
      userData: setupScript,
      terminatedAfterInMinutes: terminateAfterInMinutes,
    }),
    instanceTypeId: null,
    sandboxTypeId: row.sandboxType.id,
  };
};
