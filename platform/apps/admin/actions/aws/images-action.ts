"use server";
import {
  getEc2Client,
  getImageBuilderClient,
  type ValidRegion,
} from "@/lib/aws-clients";
import { checkAdmin } from "@/lib/get-session";
import {
  CopyImageCommand,
  DeregisterImageCommand,
  DescribeImagesCommand,
  DescribeSnapshotsCommand,
} from "@aws-sdk/client-ec2";
import {
  DeleteImageCommand,
  ListImagePipelineImagesCommand,
  ListImagePipelinesCommand,
  StartImagePipelineExecutionCommand,
} from "@aws-sdk/client-imagebuilder";

export const getAWSImages = async (region: ValidRegion) => {
  await checkAdmin();

  const client = getEc2Client(region);

  const command = new DescribeImagesCommand({
    Owners: ["self"],
  });
  const res = await client.send(command);
  return (res.Images ?? []).sort((a, b) => {
    const aCreatedAt = a.CreationDate ? new Date(a.CreationDate).getTime() : 0;
    const bCreatedAt = b.CreationDate ? new Date(b.CreationDate).getTime() : 0;

    return bCreatedAt - aCreatedAt;
  });
};

export const copyImage = async (
  region: ValidRegion,
  imageId: string,
  sourceRegion: ValidRegion,
  imageName: string,
) => {
  await checkAdmin();

  const client = getEc2Client(region);

  const command = new CopyImageCommand({
    SourceImageId: imageId,
    SourceRegion: sourceRegion,
    Name: `copy ${imageName}`,
  });

  return await client.send(command);
};

export const deleteAMIImage = async (region: ValidRegion, imageId: string) => {
  await checkAdmin();

  const client = getEc2Client(region);

  const command = new DeregisterImageCommand({
    ImageId: imageId,
    DeleteAssociatedSnapshots: true,
  });
  const res = await client.send(command);
  return res;
};

export const getImagePipelines = async (region: ValidRegion) => {
  await checkAdmin();

  const client = getImageBuilderClient(region);
  const command = new ListImagePipelinesCommand();
  const res = await client.send(command);
  return res.imagePipelineList ?? [];
};

export const startImagePipeline = async (region: ValidRegion, arn: string) => {
  await checkAdmin();

  const client = getImageBuilderClient(region);

  const command = new StartImagePipelineExecutionCommand({
    imagePipelineArn: arn,
    clientToken: crypto.randomUUID(),
  });

  return await client.send(command);
};

export const getPipeLineImages = async (
  region: ValidRegion,
  imagePipelineArn: string,
) => {
  await checkAdmin();
  const client = getImageBuilderClient(region);

  const command = new ListImagePipelineImagesCommand({
    imagePipelineArn,
  });
  const res = await client.send(command);
  console.log(res.imageSummaryList);
  return res.imageSummaryList ?? [];
};

export const deleteImagePipelineImage = async (
  region: ValidRegion,
  arn: string,
) => {
  await checkAdmin();
  const client = getImageBuilderClient(region);

  const command = new DeleteImageCommand({
    imageBuildVersionArn: arn,
  });

  return await client.send(command);
};

export const getSnapShots = async (region: ValidRegion) => {
  await checkAdmin();
  const client = getEc2Client(region);
  const command = new DescribeSnapshotsCommand({
    OwnerIds: ["self"],
  });
  return await client.send(command);
};
