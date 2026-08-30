import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  GitBranch,
  Github,
  Globe2,
  MessageSquareText,
  Play,
  ShieldCheck,
  Smartphone,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { BlueprintShowcase } from "@/components/landing-page/blueprint-showcase";
import { Wordmark } from "@/components/landing-page/brand";
import { ClosingCta } from "@/components/landing-page/closing-cta";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import { GITHUB_REPOSITORY_URL } from "@/components/landing-page/links";
import { MobileShowcase } from "@/components/landing-page/mobile-showcase";
import { PricingSection } from "@/components/landing-page/pricing-section";
import { isAuthenticated } from "@/lib/get-session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "VibeOnGo — Cloud workspaces for developers and agents",
  description:
    "Launch agent-ready cloud workspaces with persistent terminals, live HTTPS previews, repository automation, and mobile control.",
};

const capabilities: { icon: LucideIcon; label: string }[] = [
  { icon: Bot, label: "Codex, OpenCode, Pi & T3" },
  { icon: Terminal, label: "Built-in tmux terminals" },
  { icon: Globe2, label: "Live HTTPS previews" },
  { icon: Smartphone, label: "Native mobile app" },
];

const workflow = [
  {
    number: "01",
    title: "Connect your code",
    description:
      "Bring a GitHub repository or create one on VibeOnGo's built-in Forgejo.",
  },
  {
    number: "02",
    title: "Launch a workspace",
    description:
      "Choose a VM or sandbox. Your tools, scripts, keys, and repositories arrive ready.",
  },
  {
    number: "03",
    title: "Build with agents",
    description:
      "Plan, implement, review, or fix with your preferred coding agent in the real project.",
  },
  {
    number: "04",
    title: "Create a pull request",
    description:
      "Review the result, run your checks, and send the finished work back through your repository workflow.",
  },
];

type DemoKind =
  | "agent"
  | "preview"
  | "terminal"
  | "review"
  | "mobile"
  | "billing";

type ProductDemo = {
  title: string;
  description: string;
  kind: DemoKind;
  steps: [string, string, string];
  gif?: string;
};

const productDemos: ProductDemo[] = [
  {
    title: "Give an issue to an agent",
    description:
      "VibeOnGo opens the repository in a clean workspace and starts the right task with project context.",
    kind: "agent",
    steps: ["Choose issue", "Agent works", "Review fix"],
  },
  {
    title: "Open a live preview",
    description:
      "Turn any development port into a secure, shareable HTTPS URL with one click.",
    kind: "preview",
    steps: ["Run server", "Expose port", "Open URL"],
  },
  {
    title: "Reconnect to your terminal",
    description:
      "Long-running commands stay alive in tmux when you close the browser or switch devices.",
    kind: "terminal",
    steps: ["Start command", "Disconnect", "Reattach"],
  },
  {
    title: "Review every new PR",
    description:
      "A GitHub event launches an isolated review task and returns the findings to the pull request.",
    kind: "review",
    steps: ["PR opens", "Agent reviews", "Comment posts"],
  },
  {
    title: "Keep working from mobile",
    description:
      "Talk to the agent, inspect its changes, answer questions, and open the terminal from your phone.",
    kind: "mobile",
    steps: ["Open app", "Check progress", "Take action"],
  },
  {
    title: "Stop paying when work stops",
    description:
      "See the active runtime, extend it when needed, or let automatic expiration stop idle compute.",
    kind: "billing",
    steps: ["Pick runtime", "Track usage", "Auto-stop"],
  },
];

function StatusDot({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs text-white/55">
      <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
      {label}
    </span>
  );
}

function WorkspacePreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl lg:mt-20">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[#5b5cf0]/15 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111216] text-white shadow-[0_40px_100px_rgba(19,20,30,0.28)] sm:rounded-[1.75rem]">
        <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 sm:px-5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff665a]" />
            <span className="size-2.5 rounded-full bg-[#ffbd44]" />
            <span className="size-2.5 rounded-full bg-[#00ca4e]" />
          </div>
          <StatusDot label="Workspace running" />
          <span className="font-mono text-[10px] text-white/35">
            vog / api-fix
          </span>
        </div>

        <div className="grid min-h-[420px] sm:min-h-[500px] md:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-white/10 bg-white/[0.025] p-4 md:block">
            <p className="mb-5 text-[10px] font-semibold tracking-[0.18em] text-white/30 uppercase">
              Workspace
            </p>
            {[
              [Code2, "Agent", true],
              [Terminal, "Terminal", false],
              [Globe2, "Previews", false],
              [GitBranch, "Changes", false],
            ].map(([Icon, label, active]) => {
              const SidebarIcon = Icon as LucideIcon;
              return (
                <div
                  key={label as string}
                  className={`mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  <SidebarIcon className="size-3.5" />
                  {label as string}
                </div>
              );
            })}
          </aside>

          <div className="grid min-w-0 grid-rows-[1fr_170px]">
            <div className="grid gap-px bg-white/10 md:grid-cols-[1.05fr_0.95fr]">
              <div className="bg-[#111216] p-5 sm:p-7">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Resolve issue #148</p>
                    <p className="mt-1 text-xs text-white/35">
                      OpenCode · Build agent
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] text-emerald-300">
                    Working
                  </span>
                </div>
                <div className="space-y-5 text-xs leading-relaxed">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[#5b5cf0]">
                      <Bot className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-white/80">
                        I found the failed session renewal path. I&apos;m
                        updating the token guard and adding a regression test.
                      </p>
                      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 font-mono text-[10px] text-white/45">
                        <p className="text-emerald-300">
                          ✓ Read auth/session.ts
                        </p>
                        <p className="mt-1 text-emerald-300">
                          ✓ Updated token guard
                        </p>
                        <p className="mt-1 text-[#a7a8ff]">
                          ● Running test suite...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden bg-[#f3f2ee] p-6 text-[#17181c] md:block">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Globe2 className="size-3.5 text-[#5b5cf0]" />
                    Live preview
                  </div>
                  <span className="font-mono text-[9px] text-black/35">
                    3000-api-fix.vibeongo.one
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
                  <div className="flex h-8 items-center gap-1.5 border-b border-black/10 px-3">
                    <span className="size-1.5 rounded-full bg-black/15" />
                    <span className="size-1.5 rounded-full bg-black/15" />
                    <span className="size-1.5 rounded-full bg-black/15" />
                  </div>
                  <div className="p-5">
                    <div className="h-2 w-20 rounded-full bg-black/80" />
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="h-24 rounded-lg bg-[#eae9ff]" />
                      <div className="h-24 rounded-lg bg-[#17181c]" />
                    </div>
                    <div className="mt-3 h-2 w-3/4 rounded-full bg-black/10" />
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-black/10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#0b0c0f] p-4 font-mono text-[10px] leading-5 text-white/45 sm:px-6">
              <div className="mb-2 flex items-center justify-between font-sans">
                <span className="flex items-center gap-2 text-[10px] font-medium text-white/65">
                  <Terminal className="size-3" /> terminal · tmux:api-fix
                </span>
                <span className="text-[9px] text-white/25">connected</span>
              </div>
              <p>
                <span className="text-emerald-300">➜</span> pnpm test auth
              </p>
              <p className="text-white/30">PASS src/auth/session.test.ts</p>
              <p>
                <span className="text-emerald-300">✓</span> 12 tests passed in
                1.42s
              </p>
              <p className="mt-1">
                <span className="text-emerald-300">➜</span>{" "}
                <span className="animate-pulse">_</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 -bottom-16 hidden w-[230px] rounded-[2rem] border-[6px] border-[#17181c] bg-[#f7f6f2] p-3 text-[#17181c] shadow-2xl lg:block">
        <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-black/15" />
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold">Issue #148</p>
          <span className="size-2 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-4 rounded-xl bg-white p-3 text-[10px] leading-relaxed shadow-sm">
          The fix is ready. All 12 tests pass and the preview has been updated.
        </div>
        <div className="mt-3 rounded-xl bg-[#17181c] p-3 text-[10px] text-white">
          <p className="text-white/45">Changed files</p>
          <p className="mt-2 text-emerald-300">
            +42 &nbsp; <span className="text-red-300">-8</span>
          </p>
        </div>
        <div className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#5b5cf0] text-[10px] font-semibold text-white">
          Open workspace <ChevronRight className="size-3" />
        </div>
      </div>
    </div>
  );
}

function DemoPlaceholder({ kind }: { kind: DemoKind }) {
  if (kind === "agent") {
    return (
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-3 p-5 sm:p-7">
        <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
          <span className="text-[9px] font-medium text-black/35">
            ISSUE #148
          </span>
          <p className="mt-2 text-xs font-semibold">Fix session renewal</p>
          <span className="mt-3 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[8px] text-amber-700">
            Open
          </span>
        </div>
        <ArrowRight className="size-4 text-[#5b5cf0]" />
        <div className="rounded-xl bg-[#17181c] p-3 text-white shadow-lg">
          <div className="flex items-center gap-2 text-[9px] text-white/45">
            <Bot className="size-3 text-[#a7a8ff]" />
            Agent task
          </div>
          <p className="mt-3 text-xs font-medium">Tests running</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "preview") {
    return (
      <div className="h-full p-5 sm:p-7">
        <div className="h-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="flex h-8 items-center gap-1.5 border-b border-black/10 px-3">
            <span className="size-1.5 rounded-full bg-red-300" />
            <span className="size-1.5 rounded-full bg-amber-300" />
            <span className="size-1.5 rounded-full bg-emerald-300" />
            <span className="ml-2 flex-1 truncate rounded-md bg-black/[0.04] px-2 py-1 font-mono text-[7px] text-black/35">
              https://3000-project.vibeongo.one
            </span>
          </div>
          <div className="grid h-[calc(100%-2rem)] grid-cols-[0.7fr_1.3fr] gap-4 p-4">
            <div className="rounded-lg bg-[#e9e9ff]" />
            <div>
              <div className="h-2 w-2/3 rounded-full bg-black/70" />
              <div className="mt-4 h-2 w-full rounded-full bg-black/10" />
              <div className="mt-2 h-2 w-4/5 rounded-full bg-black/10" />
              <div className="mt-5 h-7 w-20 rounded-lg bg-[#5b5cf0]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "terminal") {
    return (
      <div className="h-full p-5 sm:p-7">
        <div className="h-full rounded-xl bg-[#101115] p-4 font-mono text-[9px] leading-5 text-white/45 shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-white/70">tmux · build</span>
            <StatusDot label="attached" />
          </div>
          <p>
            <span className="text-emerald-300">➜</span> pnpm run build
          </p>
          <p>Creating an optimized production build...</p>
          <p className="text-emerald-300">✓ Compiled successfully</p>
          <p className="mt-2 animate-pulse text-[#a7a8ff]">
            Session remains active _
          </p>
        </div>
      </div>
    );
  }

  if (kind === "review") {
    return (
      <div className="flex h-full items-center justify-center p-5 sm:p-7">
        <div className="w-full rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="size-3.5" />
              <span className="text-[10px] font-semibold">PR #82</span>
            </div>
            <span className="rounded-full bg-violet-100 px-2 py-1 text-[8px] text-violet-700">
              Reviewing
            </span>
          </div>
          <p className="mt-3 text-xs font-medium">
            Add resumable agent sessions
          </p>
          <div className="mt-4 space-y-2 border-t border-black/10 pt-3 text-[9px] text-black/45">
            <p className="flex items-center gap-2">
              <Check className="size-3 text-emerald-500" />
              Diff inspected
            </p>
            <p className="flex items-center gap-2">
              <Check className="size-3 text-emerald-500" />
              Tests completed
            </p>
            <p className="flex items-center gap-2">
              <MessageSquareText className="size-3 text-[#5b5cf0]" />
              Posting review...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "mobile") {
    return (
      <div className="flex h-full items-end justify-center gap-3 overflow-hidden px-6 pt-5">
        <div className="h-[86%] w-28 -rotate-6 rounded-t-[1.5rem] border-[4px] border-[#17181c] bg-white p-2 shadow-xl">
          <div className="mx-auto h-1 w-8 rounded-full bg-black/15" />
          <p className="mt-4 text-[8px] font-semibold">Workspaces</p>
          <div className="mt-3 rounded-md bg-[#f2f1ed] p-2 text-[7px]">
            VibeOnGo{" "}
            <span className="float-right size-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-2 rounded-md bg-[#f2f1ed] p-2 text-[7px]">
            Mobile app
          </div>
        </div>
        <div className="h-[92%] w-28 rotate-6 rounded-t-[1.5rem] border-[4px] border-[#17181c] bg-[#111216] p-2 text-white shadow-xl">
          <div className="mx-auto h-1 w-8 rounded-full bg-white/15" />
          <p className="mt-4 text-[8px] font-semibold">Agent</p>
          <div className="mt-3 rounded-md bg-white/5 p-2 text-[7px] text-white/45">
            The preview is ready.
          </div>
          <div className="mt-2 rounded-md bg-[#5b5cf0] p-2 text-[7px]">
            Open it on this phone
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-5 sm:p-7">
      <div className="w-full rounded-xl bg-[#17181c] p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/40">ACTIVE RUNTIME</span>
          <StatusDot label="metering" />
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="font-mono text-2xl">00:18:42</p>
            <p className="mt-1 text-[9px] text-white/35">time used</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">$0.34</p>
            <p className="mt-1 text-[9px] text-white/35">current usage</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-white/5 p-2 text-[8px] text-white/45">
          <Zap className="size-3 text-amber-300" />
          Automatic shutdown in 41 minutes
        </div>
      </div>
    </div>
  );
}

function DemoCard({ demo, index }: { demo: ProductDemo; index: number }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f0efeb]">
        {demo.gif ? (
          <Image
            src={demo.gif}
            alt={`${demo.title} product demonstration`}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <DemoPlaceholder kind={demo.kind} />
        )}
        <span className="absolute top-3 left-3 rounded-full border border-black/10 bg-white/85 px-2.5 py-1 font-mono text-[8px] text-black/45 backdrop-blur-md">
          DEMO {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="p-6 sm:p-7">
        <h3 className="text-xl font-semibold tracking-tight">{demo.title}</h3>
        <p className="mt-3 text-sm leading-6 text-black/50">
          {demo.description}
        </p>
        <div className="mt-6 flex items-center gap-1.5 overflow-hidden">
          {demo.steps.map((step, stepIndex) => (
            <div key={step} className="flex min-w-0 items-center gap-1.5">
              <span className="truncate rounded-full bg-[#f2f1ed] px-2.5 py-1.5 text-[9px] font-medium text-black/50">
                {step}
              </span>
              {stepIndex < demo.steps.length - 1 ? (
                <ChevronRight className="size-3 shrink-0 text-black/20" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function Page() {
  const authenticated = await isAuthenticated();

  if (authenticated) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f6f2] text-[#17181c] selection:bg-[#5b5cf0] selection:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.08] bg-[#f7f6f2]/75 shadow-[0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#f7f6f2]/65">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="hidden items-center gap-8 text-sm text-black/55 md:flex">
            <a href="#demos" className="transition-colors hover:text-black">
              Demos
            </a>
            <a href="#platform" className="transition-colors hover:text-black">
              How it works
            </a>
            <a
              href="#automation"
              className="transition-colors hover:text-black"
            >
              Automation
            </a>
            <a href="#mobile" className="transition-colors hover:text-black">
              Mobile
            </a>
            <a href="#pricing" className="transition-colors hover:text-black">
              Pricing
            </a>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-black/60 hover:text-black"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#17181c] px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
            >
              Start building
            </Link>
          </div>
          <Link
            href="/signup"
            className="rounded-full bg-[#17181c] px-4 py-2 text-xs font-semibold text-white sm:hidden"
          >
            Start
          </Link>
        </div>
      </nav>

      <section className="relative px-5 pt-36 pb-28 sm:px-8 sm:pt-44 lg:pb-36">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(23,24,28,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(23,24,28,0.04)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_88%)] bg-[size:56px_56px]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/65 px-3 py-1.5 text-xs font-medium shadow-sm">
              <Zap className="size-3 fill-[#5b5cf0] text-[#5b5cf0]" />
              Cloud engineering, end to end
            </div>
            <h1 className="text-[clamp(3.2rem,8vw,7.8rem)] leading-[0.88] font-semibold tracking-[-0.07em]">
              Code anywhere.
              <span className="block text-black/32">Ship without waiting.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-black/55 sm:text-xl">
              Launch an agent-ready cloud workspace with persistent terminals,
              live HTTPS previews, repository automation, and mobile control.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#5b5cf0] px-7 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(91,92,240,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Launch a workspace <ArrowRight className="size-4" />
              </Link>
              <a
                href="#demos"
                className="flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/60 px-7 text-sm font-semibold hover:bg-white"
              >
                <Play className="size-3.5 fill-current" /> Watch the product
              </a>
            </div>
          </div>

          <WorkspacePreview />

          <div className="mx-auto mt-28 grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-4 lg:mt-32">
            {capabilities.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex min-h-24 flex-col items-center justify-center gap-3 bg-[#f7f6f2] p-4 text-center text-xs font-medium sm:text-sm"
              >
                <Icon className="size-4 text-[#5b5cf0]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="demos"
        className="border-t border-black/10 bg-white px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#5b5cf0] uppercase">
                See the product
              </p>
              <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
                Small demos. Real workflows.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-black/50 lg:pb-2">
              Each clip shows one complete action from trigger to result—without
              a long product tour.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {productDemos.map((demo, index) => (
              <DemoCard key={demo.title} demo={demo} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="bg-[#17181c] px-5 py-24 text-white sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#a7a8ff] uppercase">
                The complete loop
              </p>
              <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
                One place to build, run, review, and ship.
              </h2>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
              {workflow.map((step) => (
                <article
                  key={step.number}
                  className="min-h-56 bg-[#1d1e23] p-7 sm:p-8"
                >
                  <span className="font-mono text-xs text-white/25">
                    {step.number}
                  </span>
                  <h3 className="mt-12 text-xl font-medium">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="automation" className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#5b5cf0] uppercase">
              Repository automation
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
              Your backlog keeps moving.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/50">
              Turn GitHub events into isolated AI tasks. Review every new pull
              request or start fixing an issue the moment it opens.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {[
              {
                icon: ShieldCheck,
                tag: "Pull request opened",
                title: "Automatic PR review",
                copy: "Launch a clean workspace, inspect the diff, run the project, and return an actionable review.",
              },
              {
                icon: Wrench,
                tag: "Issue opened",
                title: "Automatic issue fix",
                copy: "Give an issue to a coding agent with the repository, tools, and project context already prepared.",
              },
            ].map(({ icon: Icon, tag, title, copy }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-black/10 bg-white p-7 shadow-sm sm:p-9"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#eeefff] text-[#5b5cf0]">
                    <Icon className="size-5" />
                  </span>
                  <span className="rounded-full bg-[#f2f1ed] px-3 py-1.5 text-[10px] font-medium text-black/45">
                    {tag}
                  </span>
                </div>
                <h3 className="mt-10 text-2xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-black/50">
                  {copy}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-2 text-[10px] font-medium">
                  {["Event", "Workspace", "Agent", "Result"].map(
                    (item, index) => (
                      <div key={item} className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 ${index === 3 ? "bg-emerald-100 text-emerald-700" : "bg-[#f2f1ed] text-black/50"}`}
                        >
                          {item}
                        </span>
                        {index < 3 ? (
                          <ChevronRight className="size-3 text-black/20" />
                        ) : null}
                      </div>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MobileShowcase />

      <BlueprintShowcase />

      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-[1.75rem] bg-[#e9e9ff] p-8 sm:p-10 lg:col-span-2">
              <Globe2 className="size-6 text-[#5b5cf0]" />
              <h3 className="mt-16 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Every service gets a secure live URL.
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">
                Turn localhost into an HTTPS preview through VibeOnGo&apos;s
                proxy. No certificates, tunnels, or temporary deployments.
              </p>
              <div className="mt-10 flex flex-col gap-2 rounded-2xl bg-white/65 p-4 font-mono text-[11px] sm:flex-row sm:items-center">
                <span className="text-black/35">localhost:3000</span>
                <ArrowRight className="size-3 text-[#5b5cf0]" />
                <span className="font-medium text-[#5b5cf0]">
                  https://3000-project.vibeongo.one
                </span>
              </div>
            </article>
            <article className="rounded-[1.75rem] bg-[#17181c] p-8 text-white sm:p-10">
              <Terminal className="size-6 text-emerald-300" />
              <h3 className="mt-16 text-3xl font-semibold tracking-tight">
                Terminals that stay alive.
              </h3>
              <p className="mt-4 text-sm leading-6 text-white/45">
                Built-in terminal sessions run on tmux, so long tasks survive
                disconnects and device changes.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-black/10 bg-white p-8 sm:p-10">
              <Github className="size-6" />
              <h3 className="mt-16 text-3xl font-semibold tracking-tight">
                Your repositories, your way.
              </h3>
              <p className="mt-4 text-sm leading-6 text-black/50">
                Connect GitHub or create repositories directly on the built-in
                Forgejo service.
              </p>
            </article>
            <article className="rounded-[1.75rem] border border-black/10 bg-white p-8 sm:p-10 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Bot className="size-6 text-[#5b5cf0]" />
                <span className="text-[10px] font-semibold tracking-[0.16em] text-black/30 uppercase">
                  Your agents, configured
                </span>
              </div>
              <h3 className="mt-16 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Codex, OpenCode, Pi, and T3 Code in the same real development
                environment.
              </h3>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Build", "Plan", "Review PR", "Resolve issue"].map((task) => (
                  <span
                    key={task}
                    className="rounded-full bg-[#f2f1ed] px-4 py-2 text-xs text-black/55"
                  >
                    {task}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <PricingSection />
      <ClosingCta />
      <LandingFooter />
    </main>
  );
}
