import { Plus } from "lucide-react";

export const faqs = [
  {
    q: "Is VibeOnGo an online code editor?",
    a: "It's broader than an editor. VibeOnGo manages a complete remote development environment: repositories, terminals, agents, services, previews, automations and the runtime lifecycle.",
  },
  {
    q: "Does the code run on my phone?",
    a: "No. The code and the agent run in a cloud VM or sandbox. The Android app displays and controls the remote session.",
  },
  {
    q: "Do I need a GitHub account for my repos?",
    a: "You sign in with GitHub, but your repositories don't have to live there. Every account gets a built-in Forgejo account where you can create, fork or template repositories.",
  },
  {
    q: "Which coding agents are supported?",
    a: "Codex, OpenCode, Pi and T3 Code. Save your agent configuration once and reuse it across projects.",
  },
  {
    q: "What happens when I close the browser?",
    a: "Terminal commands keep running in tmux. The runtime stays available until you terminate it or it reaches its expiration time.",
  },
  {
    q: "How is cost controlled?",
    a: "Runtime usage is metered and visible in your wallet. Sessions have configurable auto-shutdown, so idle compute doesn't keep running.",
  },
  {
    q: "Is agent output safe to merge automatically?",
    a: "No — and VibeOnGo doesn't pretend it is. Agent work arrives through a pull request so you can run checks and review before merging.",
  },
  {
    q: "Is VibeOnGo open source?",
    a: "Yes, the source is public on GitHub under the Elastic License 2.0. Read the license before redistributing it or offering it as a managed service.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="border-lp-ink/10 bg-lp-surface scroll-mt-16 border-t px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div>
          <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl sm:leading-[1.02]">
            Questions, answered.
          </h2>
        </div>
        <div className="divide-lp-ink/10 border-lp-ink/10 divide-y border-y">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="text-lp-ink/65 size-4 shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="text-lp-ink/75 mt-3 max-w-2xl text-sm leading-6">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
