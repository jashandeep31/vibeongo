import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import { db, ec2, eq } from "@repo/db";
import { terminateEc2Instance } from "../aws/services/terminate-ec2-instance.js";
import { createEc2Instance } from "../aws/services/create-ec2-instance/index.js";

export const getAllRunningEc2s = catchAsync(
  async (req: Request, res: Response) => {
    const servers = await db.select().from(ec2);
    res.status(200).json({
      data: servers,
    });
  },
);

export const deleteEc2ServerById = catchAsync(
  async (req: Request, res: Response) => {
    const { id }: { id?: string } = req.params;
    if (!id) throw new Error("id is requried");

    const [instance] = await db.select().from(ec2).where(eq(ec2.ec2_id, id));
    if (!instance) throw new Error("Instance is not found ");
    const response = await terminateEc2Instance(instance.region, [id]);
    await db.delete(ec2).where(eq(ec2.ec2_id, id));

    res.status(200).json({
      data: response,
    });
  },
);

export const createEc2Server = catchAsync(
  async (req: Request, res: Response) => {
    const ec2res = await createEc2Instance({ region: "ap-south-1" });
    for (const instance of ec2res.Instances ?? []) {
      if (instance.InstanceId) {
        await db.insert(ec2).values({
          ec2_id: instance.InstanceId,
          region: "ap-south-1",
          ip: instance.PrivateIpAddress || null,
          status: "running",
        });
      }
    }

    res.status(201).json({
      data: "server is started",
    });
  },
);
