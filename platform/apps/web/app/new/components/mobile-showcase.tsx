import { Check, MessageSquareText, Play } from "lucide-react";
import { GOOGLE_PLAY_URL } from "./links";

const mobileFeatures = [
  "Agent conversations",
  "Native terminal",
  "PR and issue actions",
  "Runtime controls",
  "Live preview links",
  "Projects and repositories",
];

export function MobileShowcase() {
  return (
    <section
      id="mobile"
      className="border-y border-black/10 bg-white px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="relative mx-auto h-[560px] w-full max-w-lg">
          <div className="absolute top-8 left-0 w-[250px] rotate-[-6deg] rounded-[2.4rem] border-[7px] border-[#17181c] bg-[#f7f6f2] p-4 shadow-2xl sm:left-10">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-black/15" />
            <p className="mt-8 text-xs text-black/40">Projects</p>
            <p className="mt-1 text-xl font-semibold">Your workspaces</p>
            {[
              ["VibeOnGo", "Running"],
              ["Mobile app", "Stopped"],
              ["API service", "Running"],
            ].map(([name, status]) => (
              <div
                key={name}
                className="mt-3 rounded-xl border border-black/10 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{name}</span>
                  <span
                    className={`size-1.5 rounded-full ${status === "Running" ? "bg-emerald-400" : "bg-black/20"}`}
                  />
                </div>
                <p className="mt-2 text-[9px] text-black/35">{status}</p>
              </div>
            ))}
            <div className="h-8" />
          </div>

          <div className="absolute right-0 bottom-0 w-[260px] rotate-[5deg] rounded-[2.4rem] border-[7px] border-[#17181c] bg-[#111216] p-4 text-white shadow-2xl sm:right-8">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-white/15" />
            <div className="mt-7 flex items-center gap-2">
              <MessageSquareText className="size-4 text-[#a7a8ff]" />
              <p className="text-xs font-medium">Agent session</p>
            </div>
            <div className="mt-5 rounded-xl bg-white/5 p-3 text-[10px] leading-relaxed text-white/55">
              Review the authentication changes and run the related tests.
            </div>
            <div className="mt-3 rounded-xl bg-[#5b5cf0] p-3 text-[10px] leading-relaxed">
              I found two changes. The token refresh is safe, but the cookie
              fallback needs a test.
            </div>
            <div className="mt-3 rounded-xl border border-white/10 p-3 font-mono text-[9px] text-emerald-300">
              ✓ 18 tests passed
            </div>
            <div className="mt-5 flex h-10 items-center rounded-xl bg-white/5 px-3 text-[9px] text-white/25">
              Ask a follow-up...
            </div>
            <div className="h-5" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#5b5cf0] uppercase">
            VibeOnGo mobile
          </p>
          <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
            Your workspace fits in your pocket.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-black/50">
            Talk to agents, inspect diffs and tool calls, answer questions, open
            terminals, and control running infrastructure from mobile.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {mobileFeatures.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-[#5b5cf0]" />
                {item}
              </div>
            ))}
          </div>
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-9 inline-flex h-12 items-center gap-3 rounded-xl bg-[#17181c] px-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <Play className="size-5 fill-current" />
            <span className="text-left leading-none">
              <span className="block text-[9px] tracking-[0.12em] text-white/55 uppercase">
                Get it on
              </span>
              <span className="mt-1 block text-sm font-semibold">
                Google Play
              </span>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
