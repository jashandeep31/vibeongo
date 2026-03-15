import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";
import { ProjectView } from "@/components/project/project-view";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !session.id) {
    redirect("/login");
  }

  const resolvedParams = await params;
  
  return <ProjectView projectId={resolvedParams.id} />;
}
