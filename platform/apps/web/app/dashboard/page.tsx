import { PlusCircle, Send } from "lucide-react";
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
            Setup new Project with{" "}
            <span className="animate-shimmer bg-[linear-gradient(110deg,#9ca3af,45%,#f3f4f6,55%,#9ca3af)] bg-[length:200%_100%] bg-clip-text text-transparent dark:bg-[linear-gradient(110deg,#6b7280,45%,#ffffff,55%,#6b7280)]">
              AI.
            </span>
          </h1>
        </div>

        <div className="group border-border bg-background/40 focus-within:border-primary/50 focus-within:bg-background dark:bg-background/20 relative w-full rounded-[2rem] border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all duration-500 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <Textarea
            aria-label="Describe what you want to build"
            placeholder="Describe the app, repo workflow, or development environment you want to run..."
            className="placeholder:text-muted-foreground/50 min-h-[120px] resize-none border-0 bg-transparent px-4 py-2 text-lg leading-relaxed font-medium shadow-none focus-visible:ring-0 md:text-xl"
          />
          <div className="mt-2 flex items-center justify-end px-2">
            <Button
              type="button"
              className="bg-primary text-primary-foreground h-12 w-12 rounded-full shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-95"
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
