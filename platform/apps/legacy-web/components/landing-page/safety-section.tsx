import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  KeyRound,
  Lock,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { InView } from "./in-view";

const flow = [
  "protected main",
  "agent branch",
  "pull request",
  "checks & review",
  "merge",
];

const points: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Lock,
    title: "Encrypted configuration",
    copy: "Project files, agent config and keys are stored with authenticated AES‑256 encryption.",
  },
  {
    icon: KeyRound,
    title: "Repo-scoped credentials",
    copy: "Tokens only reach their own repositories, and are renewed and redacted.",
  },
  {
    icon: ShieldCheck,
    title: "Restricted agent tools",
    copy: "Git operations and provider API calls go through an allowlist, not arbitrary commands.",
  },
  {
    icon: TimerReset,
    title: "Temporary by default",
    copy: "Runtimes expire on their own, taking compute and credentials with them.",
  },
];

export function SafetySection() {
  return (
    <section className="border-lp-ink/10 bg-lp-surface border-t px-5 py-24 sm:px-8 sm:py-32">
      <InView className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl sm:leading-[1.02]"
            style={{ ["--d" as string]: "80ms" }}
          >
            Agents propose. <br className="hidden sm:block" />
            Humans merge.
          </h2>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-2 text-sm font-medium sm:flex-row sm:flex-wrap">
          {flow.map((step, i) => (
            <div
              key={step}
              className="lp-rise flex flex-col items-center gap-2 sm:flex-row"
              style={{ ["--d" as string]: `${200 + i * 120}ms` }}
            >
              <span
                className={`flex h-10 items-center rounded-lg px-4 ${i === 0 || i === flow.length - 1 ? "bg-lp-ink text-lp-on-ink" : "border-lp-ink/10 bg-lp-surface text-lp-ink/60 border"}`}
              >
                {step}
              </span>
              {i < flow.length - 1 ? (
                <ArrowRight className="text-lp-accent size-3.5 rotate-90 sm:rotate-0" />
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map(({ icon: Icon, title, copy }, i) => (
            <div
              key={title}
              className="lp-rise border-lp-ink/15 border-t pt-6"
              style={{ ["--d" as string]: `${400 + i * 80}ms` }}
            >
              <Icon className="text-lp-accent size-5" aria-hidden="true" />
              <p className="mt-6 text-sm font-semibold">{title}</p>
              <p className="text-lp-ink/75 mt-1.5 text-[13px] leading-5 text-pretty">
                {copy}
              </p>
            </div>
          ))}
        </div>
      </InView>
    </section>
  );
}
