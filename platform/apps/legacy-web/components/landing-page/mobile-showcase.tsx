import Image from "next/image";
import { Check, Play } from "lucide-react";
import appImage from "@/public/assets/app.png";
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
      className="scroll-mt-16 border-y border-black/10 bg-white px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <Image
          src={appImage}
          alt="VibeOnGo mobile apps showing workspace controls and an AI coding agent conversation"
          sizes="(max-width: 1024px) 100vw, 560px"
          className="mx-auto h-auto w-full max-w-[525px]"
        />

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
