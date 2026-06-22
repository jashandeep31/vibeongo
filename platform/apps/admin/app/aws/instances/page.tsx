import { getRunningInstances } from "@/actions/aws/instances-action";
import { validRegions } from "@/lib/aws-clients";
import { checkAdmin } from "@/lib/get-session";
import InstancesClientView from "./client-view";

const InstancesPage = async () => {
  await checkAdmin();

  const initialRegion = "ap-south-1";
  const initialStateFilter = "running";
  const instances = await getRunningInstances(initialRegion, initialStateFilter);

  return (
    <InstancesClientView
      initialRegion={initialRegion}
      initialStateFilter={initialStateFilter}
      instances={instances}
      regions={[...validRegions]}
    />
  );
};

export default InstancesPage;
