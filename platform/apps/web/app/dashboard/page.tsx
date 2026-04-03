import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { ProjectList } from "@/components/project/project-list";
import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session || !session.id) {
    redirect("/login");
  }
  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-6 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and monitor your active projects.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="dashboard/project/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Link>
        </Button>
      </div>

      <ProjectList />
    </div>
  );
}
