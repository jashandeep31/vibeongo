export default async function test() {
  // await getAWSLinuxAmis();
  // if (ec2s.filter((ec) => ec.status === "running").length >= 1) {
  //   console.log(`already running ec2 look into billing i can't spin more `);
  //   const ids: string[] = ec2s.map((instance) => instance.ec2_id);
  //   const res = await terminateEc2Instance(ids);
  //   console.log(res);
  //   return;
  // }
  // const ec2res = await createEc2Instance({
  //   region: "us-east-1",
  // });
  //
  // console.log(ec2res);
  // ec2res.Instances?.map(async (instance) => {
  //   if (instance.InstanceId) {
  //     await db.insert(ec2).values({
  //       ec2_id: instance.InstanceId,
  //       region: "us-east-1",
  //       ip: instance.PrivateIpAddress || null,
  //       status: "running",
  //     });
  //   }
  // });
  //
  // await getAWSLinuxAmis();
  //
  console.log(`Test server in running`);
}
