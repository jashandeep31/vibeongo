import { useLocalSearchParams } from "expo-router";

import { EnvironmentFilesScreen } from "@/components/projects/environment-files-screen";

export default function EnvironmentFilesRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  return <EnvironmentFilesScreen projectId={projectId} />;
}
