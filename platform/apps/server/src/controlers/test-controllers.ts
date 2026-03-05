import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import { db, ec2, eq } from "@repo/db";
import { terminateEc2Instance } from "../aws/services/terminate-ec2-instance.js";
import { createEc2Instance } from "../aws/services/create-ec2-instance/index.js";
import { awsSupportedRegions } from "../aws/configs/aws-supported-regions-configs.js";
import { getEc2Client } from "../aws/ec2-client.js";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { getInstancePublicAddress } from "../aws/services/get-instance-public-address.js";

export const getAllRunningEc2s = catchAsync(
  async (_req: Request, res: Response) => {
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
  async (_req: Request, res: Response) => {
    // WARN: the region is hard coded here
    const REGION: (typeof awsSupportedRegions)[number] = "ap-south-1";

    const ec2res = await createEc2Instance({ region: REGION });
    for (const instance of ec2res.Instances ?? []) {
      if (instance.InstanceId) {
        // TODO: create a better bg runner task
        await new Promise<void>((res) => setTimeout(res, 5000));
        const publicIpAddress = await getInstancePublicAddress(
          instance.InstanceId,
          REGION,
        );
        await db.insert(ec2).values({
          ec2_id: instance.InstanceId,
          region: REGION,
          ip: publicIpAddress || null,
          status: "running",
        });
      }
    }

    res.status(201).json({
      data: "server is started",
    });
  },
);
