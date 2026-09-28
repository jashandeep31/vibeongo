import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Hand,
  Loader2,
  ShieldCheck,
  Siren,
  Webhook,
} from "lucide-react";
import { IconBadge } from "./icon-badge";
import { InView } from "./in-view";

const triggers: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Hand,
    title: "Manual",
    copy: "Run a saved set of agent tasks with one tap, from web or mobile.",
  },
  {
    icon: CalendarClock,
    title: "Schedule",
    copy: "Cron in your own timezone for maintenance and health reports.",
  },
  {
    icon: Webhook,
    title: "Webhook",
    copy: "Any system can start a run. Secrets are hashed and rotatable.",
  },
  {
    icon: Siren,
    title: "Sentry",
    copy: "A new production error becomes an investigation session.",
  },
];

const runs = [
  { name: "Review new PR #139", source: "webhook", state: "done" },
  { name: "Investigate TypeError in checkout", source: "sentry", state: "done" },
  { name: "Weekly dependency report", source: "schedule", state: "running" },
];

export function AutomationSection() {
  return (
    <section id="automation" className="scroll-mt-16 px-5 py-24 sm:px-8 sm:py-32">
      <InView className="mx-auto max-w-7xl" threshold={0.15}>
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="lp-reveal text-xs font-semibold tracking-[0.18em] text-lp-accent uppercase">
              Project automations
            </p>
            <h2
              className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]"
              style={{ ["--d" as string]: "80ms" }}
            >
              Your backlog moves while you sleep.
            </h2>
            <p
              className="lp-reveal mt-6 max-w-xl text-lg leading-8 text-pretty text-lp-ink/50"
              style={{ ["--d" as string]: "160ms" }}
            >
              Save ordered prompts, target paths, roles and models as an
              automation. Every run gets its own isolated session, a tracked
              status and a result you can rate.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {triggers.map(({ icon: Icon, title, copy }, i) => (
                <div
                  key={title}
                  className="lp-rise lp-card rounded-2xl border border-lp-ink/10 bg-lp-surface p-5"
                  style={{ ["--d" as string]: `${200 + i * 80}ms` }}
                >
                  <IconBadge icon={Icon} />
                  <p className="mt-6 text-sm font-semibold">{title}</p>
                  <p className="mt-1.5 text-[13px] leading-5 text-pretty text-lp-ink/50">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-pop self-end rounded-[1.75rem] border border-lp-ink/10 bg-lp-surface p-6 shadow-[0_30px_80px_-30px_rgba(23,24,28,0.3)] sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-lp-ink text-lp-on-ink">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Review every new PR</p>
                  <p className="text-[11px] text-lp-ink/40">
                    pr-reviewer · runs on pull_request.opened
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                Enabled
              </span>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-[11px] font-medium">
              {["Event", "Workspace", "Agent", "Result"].map((item, index) => (
                <div
                  key={item}
                  className="lp-rise flex items-center gap-2"
                  style={{ ["--d" as string]: `${500 + index * 200}ms` }}
                >
                  <span
                    className={`rounded-full px-3 py-1.5 ${index === 3 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-lp-muted text-lp-ink/55"}`}
                  >
                    {item}
                  </span>
                  {index < 3 ? (
                    <ChevronRight className="size-3 text-lp-ink/25" />
                  ) : null}
                </div>
              ))}
            </div>

            <p className="mt-8 text-[10px] font-semibold tracking-[0.15em] text-lp-ink/30 uppercase">
              Run history
            </p>
            <ul className="mt-3 divide-y divide-lp-ink/5 rounded-2xl bg-lp-canvas">
              {runs.map((run, i) => (
                <li
                  key={run.name}
                  className="lp-rise flex items-center justify-between gap-3 px-4 py-3.5 text-xs"
                  style={{ ["--d" as string]: `${1300 + i * 160}ms` }}
                >
                  <span className="flex items-center gap-2.5">
                    {run.state === "done" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Loader2 className="size-3.5 animate-spin text-lp-accent" />
                    )}
                    {run.name}
                  </span>
                  <span className="rounded-full bg-lp-surface px-2.5 py-1 font-mono text-[10px] text-lp-ink/45">
                    {run.source}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </InView>
    </section>
  );
}
