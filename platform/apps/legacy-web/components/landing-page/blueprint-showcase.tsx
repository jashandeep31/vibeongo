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
        <div className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-10">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#5b5cf0] uppercase">
              Reusable environments
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
              Configure once. Launch anywhere.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-black/50">
              Save the repository, scripts, services, network rules, keys, and
              agent setup as a project blueprint. Every new session starts from
              the same known state.
            </p>
          </div>

          <div>
            <div className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-sm">
              <div className="flex h-12 items-center justify-between border-b border-black/10 px-5">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <FileCode2 className="size-4 text-[#5b5cf0]" />
                  workspace.config
                </div>
                <span className="text-[9px] text-black/30">
                  Reusable blueprint
                </span>
              </div>
              <div className="grid md:grid-cols-[1fr_0.95fr]">
                <div className="border-b border-black/10 p-6 font-mono text-[10px] leading-6 text-black/45 md:border-r md:border-b-0 sm:p-8">
                  <p><span className="text-[#5b5cf0]">project</span>: vibeongo</p>
                  <p><span className="text-[#5b5cf0]">repository</span>: github.com/.../vibeongo</p>
                  <p><span className="text-[#5b5cf0]">agent</span>: codex</p>
                  <p><span className="text-[#5b5cf0]">services</span>: [postgres, valkey]</p>
                  <p><span className="text-[#5b5cf0]">preview_ports</span>: [3000, 8080]</p>
                  <p><span className="text-[#5b5cf0]">auto_stop</span>: 60m</p>
                  <p className="mt-3 text-emerald-600">✓ Ready to launch</p>
                </div>
                <div className="bg-[#f2f1ed] p-6 sm:p-8">
                  <p className="text-[9px] font-semibold tracking-[0.15em] text-black/30 uppercase">
                    Launch target
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {providers.map((provider, index) => (
                      <div
                        key={provider}
                        className={`rounded-xl border p-3 text-center text-xs font-semibold ${index === 0 ? "border-[#5b5cf0] bg-[#e9e9ff] text-[#5b5cf0]" : "border-black/10 bg-white text-black/50"}`}
                      >
                        {provider}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#17181c] text-xs font-semibold text-white">
                    Launch workspace <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {blueprintDetails.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-xl border border-black/10 bg-white p-4"
                >
                  <Icon className="size-4 text-[#5b5cf0]" />
                  <p className="mt-6 text-[11px] font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
