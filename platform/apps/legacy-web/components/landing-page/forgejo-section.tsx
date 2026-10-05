import {
  GitFork,
  GitPullRequest,
  LayoutTemplate,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { InView } from "./in-view";

const ways = [
  { icon: Plus, title: "New repo", copy: "Start from scratch." },
  { icon: GitFork, title: "Fork", copy: "Bring any public repo." },
  { icon: LayoutTemplate, title: "Template", copy: "Start from a demo." },
];

export function ForgejoSection() {
  return (
    <section
      id="forgejo"
      className="scroll-mt-16 overflow-hidden bg-[#1a120c] px-5 py-24 text-white sm:px-8 sm:py-32"
    >
      <InView className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2
            className="lp-reveal mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl sm:leading-[1.02]"
            style={{ ["--d" as string]: "80ms" }}
          >
            Not every repo <br className="hidden sm:block" />
            needs{" "}
            <span className="lp-strike relative text-white/40">GitHub</span>.
          </h2>
          <p
            className="lp-reveal mt-6 max-w-xl text-lg leading-8 text-pretty text-white/75"
            style={{ ["--d" as string]: "160ms" }}
          >
            Every VibeOnGo account comes with its own Forgejo account. Create,
            fork or template a repository in seconds — issues, pull requests,
            automations and the mobile app all work the same way.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {ways.map(({ icon: Icon, title, copy }, i) => (
              <div
                key={title}
                className="lp-rise border-t border-white/20 pt-5"
                style={{ ["--d" as string]: `${240 + i * 90}ms` }}
              >
                <Icon className="size-5 text-[#ff9a4d]" aria-hidden="true" />
                <p className="mt-6 text-sm font-semibold">{title}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-white/75">
                  {copy}
                </p>
              </div>
            ))}
          </div>
          <p
            className="lp-reveal mt-6 text-[13px] text-white/75"
            style={{ ["--d" as string]: "500ms" }}
          >
            Prefer your own Git client? Set a Forgejo password in Settings and
            push over HTTPS.
          </p>
        </div>

        <div className="lp-pop relative">
          <svg viewBox="0 0 560 260" className="w-full" aria-hidden="true">
            <line
              className="lp-draw"
              x1="20"
              y1="190"
              x2="540"
              y2="190"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="6"
              strokeLinecap="round"
              pathLength={1}
            />
            <path
              className="lp-draw"
              style={{ ["--d" as string]: "500ms" }}
              d="M110 190 C150 190 150 70 200 70 L360 70 C410 70 410 190 450 190"
              fill="none"
              stroke="#ff7a1a"
              strokeWidth="6"
              strokeLinecap="round"
              pathLength={1}
            />
            {[110, 450].map((x, i) => (
              <circle
                key={x}
                className="lp-dot"
                style={{ ["--d" as string]: i ? "1500ms" : "200ms" }}
                cx={x}
                cy={190}
                r="11"
                fill="#fff"
                stroke="#1a120c"
                strokeWidth="4"
              />
            ))}
            {[240, 280, 320].map((x, i) => (
              <circle
                key={x}
                className="lp-dot"
                style={{ ["--d" as string]: `${900 + i * 150}ms` }}
                cx={x}
                cy={70}
                r="9"
                fill="#ff7a1a"
                stroke="#1a120c"
                strokeWidth="4"
              />
            ))}
            <text
              x="20"
              y="230"
              fill="rgba(255,255,255,0.65)"
              fontSize="17"
              fontFamily="var(--font-mono)"
            >
              main
            </text>
            <text
              x="200"
              y="40"
              fill="#ff9a4d"
              fontSize="17"
              fontFamily="var(--font-mono)"
            >
              agent/fix-login
            </text>
          </svg>

          <div
            className="lp-rise mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.05] p-5"
            style={{ ["--d" as string]: "1300ms" }}
          >
            <div className="flex items-center gap-3">
              <GitPullRequest className="size-5 text-[#ff9a4d]" />
              <div>
                <p className="text-sm font-semibold">you/side-project #1</p>
                <p className="mt-0.5 text-xs text-white/75">
                  Example: Fix login redirect · reviewed
                </p>
              </div>
            </div>
            <span className="lp-stamp rounded-lg border-2 border-violet-400 px-2.5 py-1 text-xs font-black tracking-wider text-violet-300">
              MERGED
            </span>
          </div>
          <div
            className="lp-rise mt-3 inline-flex items-center gap-2 rounded-lg bg-[#c6ff3d] px-4 py-2 text-xs font-semibold text-black"
            style={{ ["--d" as string]: "1700ms" }}
          >
            <ShieldCheck className="size-3.5" /> main is protected automatically
          </div>
        </div>
      </InView>
    </section>
  );
}
