import {
  ArrowRight,
  Bot,
  Boxes,
  Container,
  Globe2,
  Layers,
  Terminal,
  TimerReset,
  Zap,
} from "lucide-react";
import { IconBadge } from "./icon-badge";
import { InView } from "./in-view";

/* Every card: icon badge → 56px → title → 12px → copy → (visual pinned to the bottom). */
const cardTitle = "mt-14 text-[28px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance";
const cardCopy = "mt-3 mb-10 max-w-xl text-sm leading-6 text-pretty";

const sessions = [
  { name: "feat-billing", role: "build" },
  { name: "pr-review-139", role: "review" },
  { name: "fix-142", role: "issue" },
];

const tiles = [
  { icon: Boxes, t: "Multiple repos", d: "Many repos per project, each in its own folder." },
  { icon: Container, t: "Docker services", d: "Postgres, Redis and friends start with the app." },
  { icon: Zap, t: "VM or sandbox", d: "Full machines or fast, disposable sandboxes." },
  { icon: TimerReset, t: "Auto-shutdown", d: "Idle compute stops itself. You pay for work." },
];

export function FeatureBento() {
  return (
    <section
      id="features"
      className="scroll-mt-16 border-t border-lp-ink/10 bg-lp-surface px-5 py-24 sm:px-8 sm:py-32"
    >
      <InView className="mx-auto max-w-7xl" threshold={0.1}>
        <div className="max-w-3xl">
          <p className="lp-reveal text-xs font-semibold tracking-[0.18em] text-lp-accent uppercase">
            Everything around the agent
          </p>
          <h2
            className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]"
            style={{ ["--d" as string]: "80ms" }}
          >
            Not just a chat. A whole workspace.
          </h2>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <article
            className="lp-rise lp-card flex flex-col rounded-[1.75rem] bg-lp-accent-tint p-8 sm:p-10 lg:col-span-2"
            style={{ ["--d" as string]: "120ms" }}
          >
            <IconBadge icon={Globe2} />
            <h3 className={cardTitle}>Every service gets a secure live URL.</h3>
            <p className={`${cardCopy} text-lp-ink/55`}>
              Turn localhost into an HTTPS preview through VibeOnGo&apos;s
              proxy. Test UI changes, webhooks and APIs — or open the build on
              your phone. No certificates, tunnels or temporary deploys.
            </p>
            <div className="mt-auto flex flex-col gap-2 rounded-2xl bg-lp-surface/75 px-5 py-4 font-mono text-xs sm:flex-row sm:items-center sm:gap-3">
              <span className="text-lp-ink/40">localhost:3000</span>
              <ArrowRight className="size-3.5 rotate-90 text-lp-accent sm:rotate-0 sm:[animation:lp-nudge_1.6s_ease-in-out_infinite]" />
              <span className="font-medium text-lp-accent">
                https://3000-project.vibeongo.one
              </span>
            </div>
          </article>

          <article
            className="lp-rise lp-card flex flex-col rounded-[1.75rem] bg-[#17181c] p-8 text-white sm:p-10 dark:bg-lp-muted dark:ring-1 dark:ring-white/10"
            style={{ ["--d" as string]: "200ms" }}
          >
            <IconBadge icon={Terminal} tone="terminal" />
            <h3 className={cardTitle}>Terminals that stay alive.</h3>
            <p className={`${cardCopy} text-white/50`}>
              Every terminal runs in tmux. Close the tab, switch to your phone,
              come back — the build is still running.
            </p>
            <div className="mt-auto rounded-2xl bg-white/[0.05] px-5 py-4 font-mono text-xs leading-6 text-white/55">
              <p>
                <span className="text-emerald-300">➜</span> pnpm build
              </p>
              <p className="text-emerald-300">✓ Compiled successfully</p>
              <p className="flex items-center gap-2 text-[#a7a8ff]">
                <span className="lp-pulse size-1.5 rounded-full bg-emerald-400" />
                attached · 2 devices
              </p>
            </div>
          </article>

          <article
            className="lp-rise lp-card flex flex-col rounded-[1.75rem] border border-lp-ink/10 bg-lp-canvas p-8 sm:p-10"
            style={{ ["--d" as string]: "120ms" }}
          >
            <IconBadge icon={Layers} />
            <h3 className={cardTitle}>Parallel agents, zero collisions.</h3>
            <p className={`${cardCopy} text-lp-ink/55`}>
              Each session gets its own runtime and working tree. One agent
              builds a feature while another reviews a PR.
            </p>
            <div className="mt-auto space-y-2">
              {sessions.map((s, i) => (
                <div
                  key={s.name}
                  className="flex h-10 items-center justify-between rounded-xl bg-lp-surface px-4 font-mono text-xs text-lp-ink/60 ring-1 ring-lp-ink/5"
                >
                  <span>
                    {s.name}
                    <span className="text-lp-ink/30"> · {s.role}</span>
                  </span>
                  <span
                    className="lp-pulse size-2 rounded-full bg-emerald-400"
                    style={{ animationDelay: `${i * 300}ms` }}
                  />
                </div>
              ))}
            </div>
          </article>

          <article
            className="lp-rise lp-card flex flex-col rounded-[1.75rem] border border-lp-ink/10 bg-lp-surface p-8 sm:p-10 lg:col-span-2"
            style={{ ["--d" as string]: "200ms" }}
          >
            <div className="flex items-center justify-between">
              <IconBadge icon={Bot} />
              <span className="text-[11px] font-semibold tracking-[0.16em] text-lp-ink/35 uppercase">
                Configured once, reused everywhere
              </span>
            </div>
            <h3 className={`${cardTitle} max-w-2xl`}>
              Codex, OpenCode, Pi and T3 Code in a real development
              environment.
            </h3>
            <p className={`${cardCopy} text-lp-ink/55`}>
              The agent runs next to your code: it reads files, runs tests,
              uses Git and talks to the dev server. Save agent credentials once
              and reuse them across projects.
            </p>
            <div className="mt-auto space-y-4">
              <div className="flex flex-wrap gap-2">
                {["Codex", "OpenCode", "Pi", "T3 Code"].map((a) => (
                  <span
                    key={a}
                    className="flex h-10 items-center rounded-full bg-lp-ink px-5 text-sm font-medium text-lp-on-ink"
                  >
                    {a}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-lp-ink/5 pt-4">
                <span className="mr-1 text-[11px] font-semibold tracking-[0.16em] text-lp-ink/35 uppercase">
                  Task roles
                </span>
                {["Build", "Plan", "Resolve issue", "Review PR"].map((r) => (
                  <span
                    key={r}
                    className="flex h-8 items-center rounded-full border border-lp-ink/10 px-3.5 text-xs font-medium text-lp-ink/60"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
            {tiles.map(({ icon, t, d }, i) => (
              <div
                key={t}
                className="lp-rise lp-card rounded-2xl border border-lp-ink/10 bg-lp-surface p-6"
                style={{ ["--d" as string]: `${120 + i * 70}ms` }}
              >
                <IconBadge icon={icon} />
                <p className="mt-6 text-sm font-semibold">{t}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-pretty text-lp-ink/50">
                  {d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </InView>
    </section>
  );
}
