import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import {
  Bell,
  Bot,
  FileDiff,
  FolderKanban,
  GitPullRequest,
  LayoutTemplate,
  MessageCircleQuestion,
  Settings2,
  SquareTerminal,
  Wallet,
  Workflow,
} from "lucide-react";
import appImage from "@/public/assets/app.png";
import googlePlayBadge from "@/public/assets/google-play-badge.png";
import { GOOGLE_PLAY_URL } from "./links";
import { InView } from "./in-view";

const mobileFeatures: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: Bot,
    title: "Agent chats",
    copy: "Streamed replies with model and role picker.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Questions & tool calls",
    copy: "Answer the agent and inspect every tool call.",
  },
  {
    icon: SquareTerminal,
    title: "Native terminal",
    copy: "Attach to the same tmux sessions as the web.",
  },
  {
    icon: FileDiff,
    title: "Files & review",
    copy: "Browse project files and review session changes.",
  },
  {
    icon: GitPullRequest,
    title: "Repos, issues & PRs",
    copy: "GitHub and Forgejo activity in one list.",
  },
  {
    icon: Workflow,
    title: "Automations",
    copy: "Create, edit, trigger and check run history.",
  },
  {
    icon: Settings2,
    title: "Environment config",
    copy: "Edit scripts, services and runtime settings.",
  },
  {
    icon: FolderKanban,
    title: "Projects & sessions",
    copy: "Cached and synced, so it opens instantly.",
  },
  {
    icon: LayoutTemplate,
    title: "Templates & demos",
    copy: "Start a new project straight from your phone.",
  },
  {
    icon: Wallet,
    title: "Wallet & limits",
    copy: "Usage, balance and auto-shutdown settings.",
  },
];

export function MobileShowcase() {
  return (
    <section
      id="mobile"
      className="border-lp-ink/10 bg-lp-surface scroll-mt-16 overflow-hidden border-y px-5 py-24 sm:px-8 sm:py-32"
    >
      <InView
        className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]"
        threshold={0.1}
      >
        <div className="lp-phone-stage relative">
          <div className="lp-hero-glow absolute inset-10 rounded-lg" />
          <Image
            src={appImage}
            alt="VibeOnGo Android app showing workspace controls and an AI coding agent conversation"
            sizes="(max-width: 1024px) 100vw, 560px"
            className="lp-phone relative mx-auto h-auto w-full max-w-[500px]"
          />
          <div className="lp-float dark:bg-lp-muted absolute top-[8%] right-0 hidden items-center gap-2 rounded-xl bg-[#17181c] px-4 py-3 text-xs font-medium text-white shadow-xl ring-white/10 sm:flex dark:ring-1">
            <Bell className="size-3.5 text-[#a7a8ff]" />
            Agent needs your answer
          </div>
        </div>

        <div>
          <h2
            className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl sm:leading-[1.02]"
            style={{ ["--d" as string]: "80ms" }}
          >
            Your workspace. Now on Android.
          </h2>
          <p
            className="lp-reveal text-lp-ink/75 mt-6 max-w-xl text-lg leading-8 text-pretty"
            style={{ ["--d" as string]: "160ms" }}
          >
            The code and the agent run in the cloud — your phone just steers.
            Start a task at your desk, answer a question on the train, open the
            preview and ship the PR from anywhere.
          </p>
          <div className="mt-9 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {mobileFeatures.map(({ icon: Icon, title, copy }, i) => (
              <div
                key={title}
                className="lp-rise flex gap-3"
                style={{ ["--d" as string]: `${200 + i * 50}ms` }}
              >
                <span className="bg-lp-accent-soft text-lp-accent flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="text-lp-ink/70 mt-0.5 block text-xs leading-5">
                    {copy}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Get it on Google Play"
            className="lp-reveal mt-8 -ml-[11px] inline-block transition-transform hover:-translate-y-0.5"
            style={{ ["--d" as string]: "700ms" }}
          >
            {/* Official badge artwork; its transparent margin is Google's required clear space. */}
            <Image
              src={googlePlayBadge}
              alt="Get it on Google Play"
              width={180}
              height={70}
              className="h-[70px] w-[180px]"
            />
          </a>
        </div>
      </InView>
    </section>
  );
}
