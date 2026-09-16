import { isAuthenticated } from "@/lib/get-session";
import { redirect } from "next/navigation";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }

  const resolvedParams = await params;

  redirect(`/projects/${resolvedParams.id}`);
}
