import { RunInstancesCommandOutput } from "@aws-sdk/client-ec2";
import { createEc2Instance } from "./aws/services/create-ec2-instance/index.js";
import { db, ec2 } from "@repo/db";

export default async function test() {
  const ec2s = await db.select().from(ec2);
  if (ec2s.filter((ec) => ec.status === "running").length >= 1) {
    console.log(`already running ec2 look into billing i can't spin more `);
    return;
  }
  const ec2res = await createEc2Instance({
    region: "us-east-1",
  });

  console.log(ec2res);
  ec2res.Instances?.map(async (instance) => {
    if (instance.InstanceId) {
      await db.insert(ec2).values({
        ec2_id: instance.InstanceId,
        region: "us-east-1",
        ip: instance.PrivateIpAddress || null,
        status: "running",
      });
    }
  });

  // await getAWSLinuxAmis();
  //
  console.log(`Test server in running`);
}
