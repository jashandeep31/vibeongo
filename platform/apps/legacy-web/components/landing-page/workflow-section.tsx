import { InView } from "./in-view";

const workflow = [
  {
    title: "Connect your code",
    description:
      "Bring a GitHub repository or create one on the built-in Forgejo. Attach one or many repos to a project.",
  },
  {
    title: "Describe the environment once",
    description:
      "Scripts, Docker services, preview ports, SSH keys and agent config become a reusable project blueprint.",
  },
  {
    title: "Launch a session",
    description:
      "Pick a VM or sandbox and add tasks. Each session gets its own isolated runtime, so agents never collide.",
  },
  {
    title: "Work with the agent",
    description:
      "Chat, answer questions, inspect tool calls and open terminals — from the browser or the Android app.",
  },
  {
    title: "Preview and ship",
    description:
      "Test on a live HTTPS URL, run checks, and send the work back through a pull request to a protected main.",
  },
  {
    title: "Shut it down",
    description:
      "Stop the runtime yourself or let auto-expiry do it. Your blueprint and session history stay for next time.",
  },
];

export function WorkflowSection() {
  return (
    <section id="platform" className="scroll-mt-16 border-t border-lp-ink/10 px-5 py-24 sm:px-8 sm:py-32">
      <InView className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="lp-reveal text-xs font-semibold tracking-[0.18em] text-lp-accent uppercase">
              The complete loop
            </p>
            <h2
              className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]"
              style={{ ["--d" as string]: "80ms" }}
            >
              Build, run, review and ship in one place.
            </h2>
          </div>
          <p
            className="lp-reveal max-w-md text-sm leading-6 text-pretty text-lp-ink/50 lg:pb-3"
            style={{ ["--d" as string]: "160ms" }}
          >
            VibeOnGo doesn&apos;t replace Git, your cloud or your agent. It
            connects them into one workflow with a reproducible environment for
            every task.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workflow.map((step, i) => (
            <li
              key={step.title}
              className="lp-rise lp-card group relative rounded-[1.5rem] border border-lp-ink/10 bg-lp-surface p-7 sm:p-8"
              style={{ ["--d" as string]: `${200 + i * 90}ms` }}
            >
              <span className="relative z-10 flex size-10 items-center justify-center rounded-xl bg-lp-ink font-mono text-xs text-lp-on-ink transition-colors group-hover:bg-[#5b5cf0] group-hover:text-white">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-10 text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-pretty text-lp-ink/50">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </InView>
    </section>
  );
}
