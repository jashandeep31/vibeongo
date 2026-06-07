import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";

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

  redirect(`/projects/${resolvedParams.id}`);
}
