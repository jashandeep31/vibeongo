import {
  getAWSImages,
  getImagePipelines,
  getSnapShots,
} from "@/actions/aws/images-action";
import { validRegions } from "@/lib/aws-clients";
import { checkAdmin } from "@/lib/get-session";
import { db, instanceRegions } from "@repo/db";
import ImagesClientView from "./client-view";

const ImagesPage = async () => {
  await checkAdmin();

  const initialRegion = "ap-south-1";
  const images = await getAWSImages(initialRegion);
  const pipelines = await getImagePipelines(initialRegion);
  const snapshots = await getSnapShots(initialRegion);
  const liveAmis = await db
    .select({
      id: instanceRegions.id,
      ami: instanceRegions.ami,
      name: instanceRegions.name,
      slug: instanceRegions.slug,
    })
    .from(instanceRegions);

  return (
    <ImagesClientView
      images={images}
      initialRegion={initialRegion}
      liveAmis={liveAmis}
      pipelines={pipelines}
      regions={[...validRegions]}
      snapshots={snapshots.Snapshots ?? []}
    />
  );
};

export default ImagesPage;
