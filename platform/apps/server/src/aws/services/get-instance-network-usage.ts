import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { awsSupportedRegions } from "../../aws/configs/aws-supported-regions-configs.js";
import { getCloudWatchClient } from "../ec2-client.js";

interface getInstanceNetworkUsageProps {
  region: (typeof awsSupportedRegions)[number];
  instanceId: string;
  metricName: "NetworkIn" | "NetworkOut";
  startTime: Date;
  endTime: Date;
}
export const getEc2InstanceNetworkUsage = async ({
  region,
  instanceId,
  metricName,
  startTime,
  endTime,
}: getInstanceNetworkUsageProps) => {
  const client = getCloudWatchClient(region);

  const res = await client.send(
    new GetMetricStatisticsCommand({
      Namespace: "AWS/EC2",
      MetricName: metricName,
      Dimensions: [
        {
          Name: "InstaceId",
          Value: instanceId,
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60,
      Statistics: ["Sum"],
    }),
  );
  return res;
};
