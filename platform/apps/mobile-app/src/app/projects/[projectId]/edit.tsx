import { useLocalSearchParams } from "expo-router";

import { ProjectFormScreen } from "@/components/projects/project-form-screen";

export default function EditProjectRoute() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  return <ProjectFormScreen projectId={projectId} />;
}
