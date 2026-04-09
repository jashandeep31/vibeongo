import {
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
  projectSessions,
} from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { terminateEc2Instance } from "../../aws/services/terminate-ec2-instance.js";
import { AppError } from "../../lib/app-error.js";

export const suspendSessionInstance = catchAsync(
  async (req: Request, res: Response) => {
    const { id, instanceId } = z
      .object({ id: z.string(), instanceId: z.string() })
      .parse(req.params);

    const [row] = await db
      .select()
      .from(instances)
      .innerJoin(
        instanceTypes,
        eq(instanceTypes.id, instances.instance_type_id),
      )
      .innerJoin(
        instanceRegions,
        eq(instanceRegions.id, instanceTypes.region_id),
      )
      .where(eq(instances.id, instanceId));

    if (!row) throw new AppError("Instance not found", 404);

    const awsResponse = await terminateEc2Instance(row.instance_regions.slug, [
      row.instances.aws_instance_id,
    ]);

    await db
      .update(instances)
      .set({ terminated_at: new Date(), state: "terminated" })
      .where(eq(instances.id, instanceId));

    res.status(200).json({});
  },
);
