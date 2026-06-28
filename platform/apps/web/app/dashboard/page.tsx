import { PromptInput } from "@/components/chat/prompt-input";
import { ProjectList } from "@/components/project/project-list";
import { RunningInstancesList } from "@/components/project/running-instances-list";
import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";

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

        <PromptInput mode="new-chat" />
      </section>

      <ProjectList />
      <RunningInstancesList />
    </div>
  );
}
