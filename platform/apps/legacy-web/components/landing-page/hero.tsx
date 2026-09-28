import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  GitPullRequest,
  Globe2,
  Play,
  Zap,
} from "lucide-react";
import heroImage from "@/public/assets/hero.png";

const agents = ["Codex", "OpenCode", "Pi", "T3 Code"];

export function Hero({ appLoginUrl }: { appLoginUrl: string }) {
  return (
    <section className="relative px-5 pt-36 pb-20 sm:px-8 sm:pt-44 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--lp-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--lp-grid)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] bg-[size:56px_56px]" />
      <div className="lp-hero-glow pointer-events-none absolute top-24 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-5xl text-center">
          <div className="lp-hero-in mb-7 inline-flex items-center gap-2 rounded-full border border-lp-ink/10 bg-lp-surface/70 px-3 py-1.5 text-xs font-medium shadow-sm">
            <Zap className="size-3 fill-lp-accent text-lp-accent" />
            Cloud workspaces for AI coding agents
          </div>
          <h1
            className="lp-hero-in text-[clamp(3rem,7.6vw,7.4rem)] leading-[0.9] font-semibold tracking-[-0.07em]"
            style={{ animationDelay: "80ms" }}
          >
            Give your agent
            <span className="block">
              a <span className="lp-underline">real computer</span>.
            </span>
          </h1>
          <p
            className="lp-hero-in mx-auto mt-10 max-w-2xl text-lg leading-8 text-balance text-lp-ink/55 sm:text-xl"
            style={{ animationDelay: "180ms" }}
          >
            Connect a repository, launch an isolated VM or sandbox, and work
            with your coding agent in a real development environment, from the
            web or your phone.
          </p>
          <div
            className="lp-hero-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "260ms" }}
          >
            <Link
              href={appLoginUrl}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#5b5cf0] px-7 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(91,92,240,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Launch a workspace <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://x.com/Jashandeep31/status/2094763753346867608"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-lp-ink/10 bg-lp-surface/60 px-7 text-sm font-semibold hover:bg-lp-surface"
            >
              <Play className="size-3.5 fill-current" /> Watch the product
            </a>
          </div>
          <div
            className="lp-hero-in mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-lp-ink/45"
            style={{ animationDelay: "340ms" }}
          >
            <span className="hidden sm:inline">Works with</span>
            {agents.map((agent) => (
              <span
                key={agent}
                className="rounded-full border border-lp-ink/10 bg-lp-surface px-3 py-1 font-medium text-lp-ink/70"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>

        {/* 3D product shot: tilted back, flattens as it scrolls into view. */}
        <div className="lp-stage relative mx-auto mt-16 max-w-6xl lg:mt-20">
          <div className="lp-tilt relative">
            <Image
              src={heroImage}
              alt="VibeOnGo projects dashboard with the mobile app running an agent conversation"
              priority
              sizes="(max-width: 1280px) 100vw, 1152px"
              className="h-auto w-full drop-shadow-[0_30px_50px_rgba(23,24,28,0.22)]"
            />

            <div className="lp-float absolute bottom-[14%] left-[4%] hidden h-11 items-center gap-2.5 rounded-full border border-lp-ink/10 bg-lp-surface px-4 text-xs font-medium shadow-[0_12px_32px_-12px_rgba(23,24,28,0.35)] md:flex">
              <Globe2 className="size-4 text-lp-accent" />
              <span className="font-mono text-[11px] font-medium text-lp-accent">
                https://3000-project.vibeongo.one
              </span>
            </div>
            <div
              className="lp-float absolute bottom-[14%] left-[38%] hidden h-11 items-center gap-2.5 rounded-full bg-[#5b5cf0] pr-4 pl-1.5 text-xs font-medium text-white shadow-[0_12px_32px_-12px_rgba(91,92,240,0.6)] md:flex"
              style={{ animationDelay: "-2s" }}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-lp-surface/15">
                <Check className="size-4 text-white" strokeWidth={2.5} />
              </span>
              48 tests passed
            </div>
            <div
              className="lp-float absolute -top-5 right-[4%] hidden h-11 items-center gap-2.5 rounded-full border border-lp-ink/10 bg-lp-surface px-4 text-xs font-medium shadow-[0_12px_32px_-12px_rgba(23,24,28,0.35)] lg:flex"
              style={{ animationDelay: "-4s" }}
            >
              <GitPullRequest className="size-4 text-violet-600 dark:text-violet-400" />
              Pull request #143 opened
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
