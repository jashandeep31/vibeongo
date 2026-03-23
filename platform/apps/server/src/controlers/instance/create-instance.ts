import { Request, Response } from "express";
import { catchAsync } from "../../lib/catch-async.js";
import { AppError } from "../../lib/appError.js";
import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  projects,
} from "@repo/db";
import { z } from "zod";
import { createEc2Instance } from "../../aws/services/create-ec2-instance.js";
import { awsSupportedRegions } from "../../aws/configs/aws-supported-regions-configs.js";
import { getInstancePublicAddress } from "../../aws/services/get-instance-public-address.js";

const createInstanceBodySchema = z.object({
  projectId: z.string(),
});

export const createInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new AppError("Authnatication is required", 400);

    const body = createInstanceBodySchema.parse(req.body);

    const [row] = await db
      .select({
        project: projects,
        instanceType: instanceTypes,
        region: instanceRegions,
      })
      .from(projects)
      .innerJoin(instanceTypes, eq(projects.instance_type_id, instanceTypes.id))
      .innerJoin(
        instanceRegions,
        eq(instanceTypes.region_id, instanceRegions.id),
      )
      .where(
        and(eq(projects.user_id, user.id), eq(projects.id, body.projectId)),
      );

    if (!row) throw new AppError("Project not found", 404);
    const instanceRegion = z.enum(awsSupportedRegions).parse(row.region.slug);
    const awsRes = await createEc2Instance({
      region: instanceRegion,
    });

    const awsInstance = awsRes?.Instances?.[0];

    if (!awsInstance?.InstanceId || !awsInstance)
      throw new AppError("Failed to create the ec2", 500);

    //NOTE: temp solution for waiting till ip4 get allocated
    await new Promise<void>((res) => setTimeout(res, 5000));
    const publicIpAddress = await getInstancePublicAddress(
      awsInstance.InstanceId,
      instanceRegion,
    );

    await db.insert(instances).values({
      project_id: row.project.id,
      instance_type: row.project.instance_type_id,
      aws_instance_id: awsInstance.InstanceId,
      terminated_at: null,
      started_at: new Date(),
      public_ip: publicIpAddress,
      state: "running",
    });

    res.status(201).json({
      message: "Successfully had created the project intance",
    });
  },
);
