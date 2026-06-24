import {
  PlusCircle,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { ProjectList } from "@/components/project/project-list";
import { RunningInstancesList } from "@/components/project/running-instances-list";
import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";
import { Textarea } from "@repo/ui/components/textarea";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session || !session.id) {
    redirect("/login");
  }
  return (
    <div className="mx-auto w-full flex-1 space-y-8 p-4 md:p-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 py-6 md:py-10">
        <div className="flex items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Setup new Project with Ai.
          </h1>
        </div>

        <div className="group relative w-full rounded-[2rem] border border-border bg-background/40 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all duration-500 focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:bg-background/20 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <Textarea
            aria-label="Describe what you want to build"
            placeholder="Describe the app, repo workflow, or development environment you want to run..."
            className="min-h-[120px] resize-none border-0 bg-transparent px-4 py-2 text-lg shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 md:text-xl font-medium leading-relaxed"
          />
          <div className="mt-2 flex items-center justify-end px-2">
            <Button 
              type="button" 
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
              size="icon"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">Submit prompt</span>
            </Button>
          </div>
        </div>


      </section>



      <ProjectList />
      <RunningInstancesList />
    </div>
  );
}
