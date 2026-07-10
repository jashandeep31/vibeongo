import { GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { awsSupportedRegions } from "../configs/aws-supported-regions-configs.js";
import { getCloudWatchClient } from "../ec2-client.js";

interface getInstanceNetworkUsageProps {
  region: string;
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
}: getInstanceNetworkUsageProps): Promise<number> => {
  const client = getCloudWatchClient(
    region as (typeof awsSupportedRegions)[number],
  );
  const res = await client.send(
    new GetMetricStatisticsCommand({
      Namespace: "AWS/EC2",
      MetricName: metricName,
      Dimensions: [
        {
          Name: "InstanceId",
          Value: instanceId,
        },
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60 * 5,
      Statistics: ["Sum"],
    }),
  );
  const toGB = (bytes: number) => bytes / 1_073_741_824;
  if (!res?.Datapoints?.length) {
    return 0;
    // TODO: This may needed to be changed in fture
  }

  const bytes = res.Datapoints.reduce((sum, datapoint) => {
    return sum + (datapoint.Sum ?? 0);
  }, 0);

  return toGB(bytes);
};
