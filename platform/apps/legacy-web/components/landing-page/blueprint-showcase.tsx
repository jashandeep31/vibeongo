import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Container,
  FileCode2,
  Globe2,
  KeyRound,
  Network,
  Terminal,
  TimerReset,
} from "lucide-react";
import { IconBadge } from "./icon-badge";

const blueprintDetails: { icon: LucideIcon; label: string }[] = [
  { icon: Container, label: "Docker services" },
  { icon: Terminal, label: "Setup scripts" },
  { icon: Network, label: "Network rules" },
  { icon: KeyRound, label: "SSH keys" },
  { icon: Globe2, label: "Preview ports" },
  { icon: Boxes, label: "Multiple repos" },
  { icon: Bot, label: "Agent config" },
  { icon: TimerReset, label: "Auto shutdown" },
];

const providers = ["AWS", "E2B", "Daytona", "Vercel"];

export function BlueprintShowcase() {
  return (
    <section id="blueprints" className="scroll-mt-16 px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-lp-accent uppercase">
              Reusable environments
            </p>
            <h2 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]">
              Configure once. Launch anywhere.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-lp-ink/50">
              Save the repository, scripts, services, network rules, keys, and
              agent setup as a project blueprint. Every new session starts from
              the same known state.
            </p>
          </div>

          <div>
            <div className="overflow-hidden rounded-[1.75rem] border border-lp-ink/10 bg-lp-surface">
              <div className="flex h-12 items-center justify-between border-b border-lp-ink/10 px-6">
                <div className="flex items-center gap-2 font-mono text-xs font-medium">
                  <FileCode2 className="size-4 text-lp-accent" />
                  workspace.config
                </div>
                <span className="text-[11px] text-lp-ink/35">
                  Reusable blueprint
                </span>
              </div>
              <div className="grid md:grid-cols-[1fr_0.95fr]">
                <div className="border-b border-lp-ink/10 p-6 font-mono text-xs leading-7 text-lp-ink/50 md:border-r md:border-b-0 sm:p-8">
                  <p><span className="text-lp-accent">project</span>: vibeongo</p>
                  <p><span className="text-lp-accent">repository</span>: github.com/.../vibeongo</p>
                  <p><span className="text-lp-accent">agent</span>: codex</p>
                  <p><span className="text-lp-accent">services</span>: [postgres, valkey]</p>
                  <p><span className="text-lp-accent">preview_ports</span>: [3000, 8080]</p>
                  <p><span className="text-lp-accent">auto_stop</span>: 60m</p>
                  <p className="mt-3 text-emerald-600 dark:text-emerald-400">✓ Ready to launch</p>
                </div>
                <div className="bg-lp-muted p-6 sm:p-8">
                  <p className="text-[11px] font-semibold tracking-[0.15em] text-lp-ink/35 uppercase">
                    Launch target
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {providers.map((provider, index) => (
                      <div
                        key={provider}
                        className={`flex h-10 items-center justify-center rounded-xl border text-xs font-semibold ${index === 0 ? "border-lp-accent bg-lp-accent-tint text-lp-accent" : "border-lp-ink/10 bg-lp-surface text-lp-ink/50"}`}
                      >
                        {provider}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lp-ink text-sm font-semibold text-lp-on-ink">
                    Launch workspace <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {blueprintDetails.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="lp-card rounded-2xl border border-lp-ink/10 bg-lp-surface p-5"
                >
                  <IconBadge icon={Icon} />
                  <p className="mt-5 text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
