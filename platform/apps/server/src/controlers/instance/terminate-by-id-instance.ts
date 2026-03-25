import {
  and,
  db,
  eq,
  instanceRegions,
  instances,
  instanceTypes,
} from "@repo/db";
import { AppError } from "../../lib/appError.js";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { terminateEc2Instance } from "../../aws/services/terminate-ec2-instance.js";

export const terminateByIdInstance = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const id = req.params.id;
    if (id === undefined || typeof id !== "string")
      throw new AppError("id is required", 400);

    if (!user) throw new AppError("authentication is required", 400);

    const [row] = await db
      .select()
      .from(instances)
      .innerJoin(
        instanceTypes,
        eq(instances.instance_type_id, instanceTypes.id),
      )
      .innerJoin(
        instanceRegions,
        eq(instanceRegions.id, instanceTypes.region_id),
      )
      .where(and(eq(instances.id, id), eq(instances.user_id, user.id)));

    if (!row) throw new AppError("Instance not found", 404);

    const awsResponse = await terminateEc2Instance(row.instance_regions.slug, [
      row.instances.aws_instance_id,
    ]);

    console.log(awsResponse);

    await db
      .update(instances)
      .set({ terminated_at: new Date(), state: "terminated" })
      .where(eq(instances.id, id));

    res.status(200).json({
      message: "Instance terminated successfully",
    });
  },
);
